"""
Tests for Billing API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User


class TestBillingEndpoints:
    """Test suite for Billing operations"""

    def test_get_balance(self, auth_client: TestClient, test_user: User):
        """Test getting user credit balance"""
        response = auth_client.get("/api/v1/billing/balance")

        assert response.status_code == 200
        data = response.json()

        assert "credits_balance" in data
        assert "email" in data
        assert data["credits_balance"] == test_user.credits_balance
        assert data["email"] == test_user.email

    def test_get_balance_unauthorized(self, client: TestClient):
        """Test getting balance without authentication"""
        response = client.get("/api/v1/billing/balance")
        assert response.status_code == 401

    def test_upgrade_request(self, auth_client: TestClient, test_user: User):
        """Test requesting account upgrade"""
        request_data = {
            "requested_credits": 10000,
            "message": "Need more credits for large project"
        }

        response = auth_client.post("/api/v1/billing/upgrade-request", json=request_data)

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "pending"
        assert "message" in data
        assert "request_id" in data or "confirmation" in data

    def test_upgrade_request_validation(self, auth_client: TestClient):
        """Test upgrade request validation"""
        # Missing required field
        invalid_data = {
            "message": "Missing requested_credits field"
        }

        response = auth_client.post("/api/v1/billing/upgrade-request", json=invalid_data)
        assert response.status_code == 422

    def test_upgrade_request_negative_credits(self, auth_client: TestClient):
        """Test upgrade request with negative credits"""
        invalid_data = {
            "requested_credits": -1000,
            "message": "Invalid negative amount"
        }

        response = auth_client.post("/api/v1/billing/upgrade-request", json=invalid_data)
        # Should either reject or have validation
        assert response.status_code in [200, 422]

    def test_add_credits_admin(self, admin_client: TestClient, test_user: User):
        """Test admin adding credits to user"""
        add_credits_data = {
            "user_id": test_user.id,
            "credits": 5000,
            "reason": "Promotional bonus"
        }

        response = admin_client.post("/api/v1/billing/add-credits", json=add_credits_data)

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "success"
        assert "new_balance" in data
        assert data["new_balance"] == test_user.credits_balance + 5000

    def test_add_credits_non_admin(self, auth_client: TestClient, test_user: User):
        """Test non-admin user trying to add credits"""
        add_credits_data = {
            "user_id": test_user.id,
            "credits": 5000,
            "reason": "Trying to cheat"
        }

        response = auth_client.post("/api/v1/billing/add-credits", json=add_credits_data)

        # Should fail - only admins can add credits
        assert response.status_code == 403

    def test_add_credits_user_not_found(self, admin_client: TestClient):
        """Test adding credits to non-existent user"""
        add_credits_data = {
            "user_id": "non-existent-user-id",
            "credits": 1000,
            "reason": "Test"
        }

        response = admin_client.post("/api/v1/billing/add-credits", json=add_credits_data)

        assert response.status_code == 404

    def test_add_credits_negative_amount(self, admin_client: TestClient, test_user: User):
        """Test adding negative credits (deduction)"""
        add_credits_data = {
            "user_id": test_user.id,
            "credits": -1000,
            "reason": "Credit adjustment"
        }

        response = admin_client.post("/api/v1/billing/add-credits", json=add_credits_data)

        # Should work - allows deductions
        assert response.status_code == 200
        data = response.json()
        assert data["new_balance"] == test_user.credits_balance - 1000


class TestCreditBalance:
    """Test suite for credit balance management"""

    def test_initial_balance(self, auth_client: TestClient, test_user: User):
        """Test user has initial balance"""
        response = auth_client.get("/api/v1/billing/balance")

        assert response.status_code == 200
        data = response.json()

        # Test user fixture sets 5000 credits
        assert data["credits_balance"] == 5000

    def test_balance_persistence(self, admin_client: TestClient, auth_client: TestClient, test_user: User):
        """Test balance persists after addition"""
        # Admin adds credits
        admin_client.post("/api/v1/billing/add-credits", json={
            "user_id": test_user.id,
            "credits": 2000,
            "reason": "Test"
        })

        # User checks balance
        response = auth_client.get("/api/v1/billing/balance")

        assert response.status_code == 200
        data = response.json()
        assert data["credits_balance"] == 7000  # 5000 + 2000

    def test_balance_cannot_go_negative(self, admin_client: TestClient, test_user: User, db: Session):
        """Test balance validation (if implemented)"""
        # Try to deduct more than available
        response = admin_client.post("/api/v1/billing/add-credits", json={
            "user_id": test_user.id,
            "credits": -10000,  # More than available 5000
            "reason": "Test deduction"
        })

        # Behavior depends on validation implementation
        # Either allows (negative balance) or rejects
        if response.status_code == 200:
            # If allowed, balance can go negative
            data = response.json()
            assert data["new_balance"] < 0
        else:
            # If rejected, returns error
            assert response.status_code in [400, 422]


class TestUpgradeWorkflow:
    """Test suite for upgrade request workflow"""

    def test_complete_upgrade_workflow(self, auth_client: TestClient, admin_client: TestClient, test_user: User):
        """Test complete upgrade workflow from request to approval"""
        # Step 1: User requests upgrade
        upgrade_response = auth_client.post("/api/v1/billing/upgrade-request", json={
            "requested_credits": 15000,
            "message": "Large project needs"
        })

        assert upgrade_response.status_code == 200

        # Step 2: Admin adds credits
        initial_balance = test_user.credits_balance

        add_response = admin_client.post("/api/v1/billing/add-credits", json={
            "user_id": test_user.id,
            "credits": 15000,
            "reason": "Upgrade request approved"
        })

        assert add_response.status_code == 200
        data = add_response.json()
        assert data["new_balance"] == initial_balance + 15000

        # Step 3: User verifies new balance
        balance_response = auth_client.get("/api/v1/billing/balance")
        assert balance_response.status_code == 200
        assert balance_response.json()["credits_balance"] == initial_balance + 15000

    def test_multiple_upgrade_requests(self, auth_client: TestClient):
        """Test user can make multiple upgrade requests"""
        # First request
        response1 = auth_client.post("/api/v1/billing/upgrade-request", json={
            "requested_credits": 5000,
            "message": "First request"
        })
        assert response1.status_code == 200

        # Second request
        response2 = auth_client.post("/api/v1/billing/upgrade-request", json={
            "requested_credits": 10000,
            "message": "Second request"
        })
        assert response2.status_code == 200

        # Both should succeed
        assert response1.json()["status"] == "pending"
        assert response2.json()["status"] == "pending"
