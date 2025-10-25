"""
Tests for Estimates API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.estimate import Estimate, EstimateItem, CostAdjustment


class TestEstimatesEndpoints:
    """Test suite for Estimates CRUD operations"""

    def test_create_estimate(self, auth_client: TestClient, test_user: User, sample_estimate_data: dict):
        """Test creating a new estimate"""
        response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == sample_estimate_data["name"]
        assert data["job_id"] == sample_estimate_data["job_id"]
        assert data["project_id"] == sample_estimate_data["project_id"]
        assert data["currency"] == sample_estimate_data["currency"]
        assert data["user_id"] == test_user.id
        assert len(data["items"]) == 2
        assert "subtotal" in data
        assert "total" in data
        assert data["subtotal"] == 10000.0  # 100*50 + 1*5000
        assert data["total"] == 10000.0  # No adjustments yet

    def test_create_estimate_with_adjustments(self, auth_client: TestClient):
        """Test creating estimate with cost adjustments"""
        estimate_data = {
            "name": "Estimate with Adjustments",
            "job_id": "job-789",
            "currency": "USD",
            "items": [
                {
                    "description": "Base Cost",
                    "unit": "lot",
                    "quantity": 1.0,
                    "unit_price": 1000.0
                }
            ],
            "adjustments": [
                {
                    "name": "Markup",
                    "adjustment_type": "percentage",
                    "value": 20.0
                },
                {
                    "name": "Discount",
                    "adjustment_type": "percentage",
                    "value": -10.0
                }
            ]
        }

        response = auth_client.post("/api/v1/estimates", json=estimate_data)

        assert response.status_code == 200
        data = response.json()
        assert data["subtotal"] == 1000.0
        # Total should be: 1000 + 20% - 10% = 1100
        assert data["total"] == 1100.0
        assert len(data["adjustments"]) == 2

    def test_create_estimate_unauthorized(self, client: TestClient, sample_estimate_data: dict):
        """Test creating estimate without authentication"""
        response = client.post("/api/v1/estimates", json=sample_estimate_data)
        assert response.status_code == 401

    def test_list_estimates(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test listing user estimates"""
        # Create two estimates
        auth_client.post("/api/v1/estimates", json=sample_estimate_data)

        estimate_data_2 = sample_estimate_data.copy()
        estimate_data_2["name"] = "Second Estimate"
        auth_client.post("/api/v1/estimates", json=estimate_data_2)

        # List estimates
        response = auth_client.get("/api/v1/estimates")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_list_estimates_empty(self, auth_client: TestClient):
        """Test listing estimates when none exist"""
        response = auth_client.get("/api/v1/estimates")

        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_get_estimate(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test getting a specific estimate"""
        # Create estimate
        create_response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)
        estimate_id = create_response.json()["id"]

        # Get estimate
        response = auth_client.get(f"/api/v1/estimates/{estimate_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == estimate_id
        assert data["name"] == sample_estimate_data["name"]
        assert len(data["items"]) == 2

    def test_get_estimate_not_found(self, auth_client: TestClient):
        """Test getting non-existent estimate"""
        response = auth_client.get("/api/v1/estimates/non-existent-id")
        assert response.status_code == 404

    def test_update_estimate(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test updating an estimate"""
        # Create estimate
        create_response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)
        estimate_id = create_response.json()["id"]

        # Update estimate
        update_data = {
            "name": "Updated Estimate Name",
            "notes": "Updated notes",
            "currency": "EUR"
        }

        response = auth_client.patch(f"/api/v1/estimates/{estimate_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Estimate Name"
        assert data["notes"] == "Updated notes"
        assert data["currency"] == "EUR"

    def test_delete_estimate(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test deleting an estimate"""
        # Create estimate
        create_response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)
        estimate_id = create_response.json()["id"]

        # Delete estimate
        response = auth_client.delete(f"/api/v1/estimates/{estimate_id}")
        assert response.status_code == 200

        # Verify deletion
        get_response = auth_client.get(f"/api/v1/estimates/{estimate_id}")
        assert get_response.status_code == 404

    def test_clone_estimate(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test cloning an estimate"""
        # Create original estimate
        create_response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)
        original_id = create_response.json()["id"]

        # Clone estimate
        response = auth_client.post(f"/api/v1/estimates/{original_id}/clone")

        assert response.status_code == 200
        data = response.json()

        # Verify clone
        assert data["id"] != original_id
        assert data["name"] == "Test Estimate (Copy)"
        assert len(data["items"]) == 2
        assert data["subtotal"] == 10000.0
        assert data["total"] == 10000.0

    def test_clone_estimate_with_adjustments(self, auth_client: TestClient):
        """Test cloning estimate with adjustments"""
        # Create estimate with adjustments
        estimate_data = {
            "name": "Original Estimate",
            "job_id": "job-123",
            "currency": "USD",
            "items": [
                {"description": "Item 1", "unit": "pcs", "quantity": 10, "unit_price": 100}
            ],
            "adjustments": [
                {"name": "Tax", "adjustment_type": "percentage", "value": 10}
            ]
        }

        create_response = auth_client.post("/api/v1/estimates", json=estimate_data)
        original_id = create_response.json()["id"]

        # Clone
        clone_response = auth_client.post(f"/api/v1/estimates/{original_id}/clone")

        assert clone_response.status_code == 200
        clone_data = clone_response.json()

        # Verify adjustments were cloned
        assert len(clone_data["adjustments"]) == 1
        assert clone_data["adjustments"][0]["name"] == "Tax"
        assert clone_data["adjustments"][0]["value"] == 10

    def test_clone_estimate_not_found(self, auth_client: TestClient):
        """Test cloning non-existent estimate"""
        response = auth_client.post("/api/v1/estimates/non-existent-id/clone")
        assert response.status_code == 404


class TestCostAdjustments:
    """Test suite for cost adjustments operations"""

    def test_create_adjustment(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test creating a cost adjustment"""
        # Create estimate
        create_response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)
        estimate_id = create_response.json()["id"]

        # Add adjustment
        adjustment_data = {
            "name": "Labor Markup",
            "adjustment_type": "percentage",
            "value": 15.0
        }

        response = auth_client.post(
            f"/api/v1/estimates/{estimate_id}/adjustments",
            json=adjustment_data
        )

        assert response.status_code == 200
        data = response.json()

        # Verify estimate total updated
        assert "total" in data
        # Subtotal is 10000, with 15% markup = 11500
        assert data["total"] == 11500.0
        assert len(data["adjustments"]) == 1

    def test_create_fixed_adjustment(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test creating a fixed amount adjustment"""
        # Create estimate
        create_response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)
        estimate_id = create_response.json()["id"]

        # Add fixed adjustment
        adjustment_data = {
            "name": "Shipping Fee",
            "adjustment_type": "fixed",
            "value": 500.0
        }

        response = auth_client.post(
            f"/api/v1/estimates/{estimate_id}/adjustments",
            json=adjustment_data
        )

        assert response.status_code == 200
        data = response.json()

        # Subtotal 10000 + 500 fixed = 10500
        assert data["total"] == 10500.0

    def test_create_negative_adjustment(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test creating a discount (negative adjustment)"""
        # Create estimate
        create_response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)
        estimate_id = create_response.json()["id"]

        # Add discount
        adjustment_data = {
            "name": "Early Payment Discount",
            "adjustment_type": "percentage",
            "value": -5.0
        }

        response = auth_client.post(
            f"/api/v1/estimates/{estimate_id}/adjustments",
            json=adjustment_data
        )

        assert response.status_code == 200
        data = response.json()

        # Subtotal 10000 - 5% = 9500
        assert data["total"] == 9500.0

    def test_delete_adjustment(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test deleting a cost adjustment"""
        # Create estimate with adjustment
        estimate_data = sample_estimate_data.copy()
        estimate_data["adjustments"] = [
            {"name": "Tax", "adjustment_type": "percentage", "value": 10}
        ]

        create_response = auth_client.post("/api/v1/estimates", json=estimate_data)
        estimate_id = create_response.json()["id"]
        adjustment_id = create_response.json()["adjustments"][0]["id"]

        # Delete adjustment
        response = auth_client.delete(
            f"/api/v1/estimates/{estimate_id}/adjustments/{adjustment_id}"
        )

        assert response.status_code == 200
        data = response.json()

        # Verify total recalculated
        assert data["total"] == data["subtotal"]
        assert len(data["adjustments"]) == 0

    def test_multiple_adjustments(self, auth_client: TestClient, sample_estimate_data: dict):
        """Test multiple adjustments compound correctly"""
        # Create estimate
        create_response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)
        estimate_id = create_response.json()["id"]

        # Add multiple adjustments
        auth_client.post(
            f"/api/v1/estimates/{estimate_id}/adjustments",
            json={"name": "Markup", "adjustment_type": "percentage", "value": 20}
        )
        auth_client.post(
            f"/api/v1/estimates/{estimate_id}/adjustments",
            json={"name": "Tax", "adjustment_type": "percentage", "value": 10}
        )
        response = auth_client.post(
            f"/api/v1/estimates/{estimate_id}/adjustments",
            json={"name": "Fee", "adjustment_type": "fixed", "value": 100}
        )

        data = response.json()

        # Subtotal: 10000
        # +20%: 12000
        # +10%: 13200
        # +100: 13300
        assert data["total"] == 13300.0


class TestEstimateCalculations:
    """Test suite for estimate totals calculations"""

    def test_subtotal_calculation(self, auth_client: TestClient):
        """Test subtotal is correctly calculated from items"""
        estimate_data = {
            "name": "Test Calculation",
            "currency": "USD",
            "items": [
                {"description": "Item 1", "unit": "pcs", "quantity": 5, "unit_price": 100},
                {"description": "Item 2", "unit": "pcs", "quantity": 10, "unit_price": 50},
                {"description": "Item 3", "unit": "pcs", "quantity": 2, "unit_price": 250}
            ]
        }

        response = auth_client.post("/api/v1/estimates", json=estimate_data)

        assert response.status_code == 200
        data = response.json()

        # Subtotal: 5*100 + 10*50 + 2*250 = 500 + 500 + 500 = 1500
        assert data["subtotal"] == 1500.0
        assert data["total"] == 1500.0

    def test_total_with_mixed_adjustments(self, auth_client: TestClient):
        """Test total calculation with mixed adjustment types"""
        estimate_data = {
            "name": "Mixed Adjustments",
            "currency": "USD",
            "items": [
                {"description": "Base", "unit": "lot", "quantity": 1, "unit_price": 1000}
            ],
            "adjustments": [
                {"name": "Markup", "adjustment_type": "percentage", "value": 50},
                {"name": "Discount", "adjustment_type": "percentage", "value": -10},
                {"name": "Shipping", "adjustment_type": "fixed", "value": 100},
                {"name": "Credit", "adjustment_type": "fixed", "value": -50}
            ]
        }

        response = auth_client.post("/api/v1/estimates", json=estimate_data)

        assert response.status_code == 200
        data = response.json()

        # Subtotal: 1000
        # +50%: 1500
        # -10%: 1350
        # +100: 1450
        # -50: 1400
        assert data["subtotal"] == 1000.0
        assert data["total"] == 1400.0


class TestEstimateDataIntegrity:
    """Test suite for estimate data integrity"""

    def test_items_cascade_delete(self, auth_client: TestClient, db: Session, sample_estimate_data: dict):
        """Test that deleting estimate also deletes items"""
        # Create estimate
        create_response = auth_client.post("/api/v1/estimates", json=sample_estimate_data)
        estimate_id = create_response.json()["id"]

        # Verify items exist
        items_count = db.query(EstimateItem).filter(
            EstimateItem.estimate_id == estimate_id
        ).count()
        assert items_count == 2

        # Delete estimate
        auth_client.delete(f"/api/v1/estimates/{estimate_id}")

        # Verify items deleted
        items_count = db.query(EstimateItem).filter(
            EstimateItem.estimate_id == estimate_id
        ).count()
        assert items_count == 0

    def test_adjustments_cascade_delete(self, auth_client: TestClient, db: Session):
        """Test that deleting estimate also deletes adjustments"""
        # Create estimate with adjustments
        estimate_data = {
            "name": "Test",
            "currency": "USD",
            "items": [{"description": "Item", "unit": "pcs", "quantity": 1, "unit_price": 100}],
            "adjustments": [
                {"name": "Tax", "adjustment_type": "percentage", "value": 10}
            ]
        }

        create_response = auth_client.post("/api/v1/estimates", json=estimate_data)
        estimate_id = create_response.json()["id"]

        # Verify adjustments exist
        adjustments_count = db.query(CostAdjustment).filter(
            CostAdjustment.estimate_id == estimate_id
        ).count()
        assert adjustments_count == 1

        # Delete estimate
        auth_client.delete(f"/api/v1/estimates/{estimate_id}")

        # Verify adjustments deleted
        adjustments_count = db.query(CostAdjustment).filter(
            CostAdjustment.estimate_id == estimate_id
        ).count()
        assert adjustments_count == 0
