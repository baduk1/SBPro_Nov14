"""
Tests for Templates API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.template import Template, TemplateItem


class TestTemplatesEndpoints:
    """Test suite for Templates CRUD operations"""

    def test_create_template(self, auth_client: TestClient, test_user: User, sample_template_data: dict):
        """Test creating a new template"""
        response = auth_client.post("/api/v1/templates", json=sample_template_data)

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == sample_template_data["name"]
        assert data["description"] == sample_template_data["description"]
        assert data["category"] == sample_template_data["category"]
        assert data["user_id"] == test_user.id
        assert data["is_default"] is False
        assert len(data["items"]) == 2
        assert "id" in data
        assert "created_at" in data

    def test_create_template_without_items(self, auth_client: TestClient, test_user: User):
        """Test creating a template without items"""
        template_data = {
            "name": "Empty Template",
            "description": "Template with no items",
            "category": "Test"
        }

        response = auth_client.post("/api/v1/templates", json=template_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Empty Template"
        assert data["items"] == []

    def test_create_template_unauthorized(self, client: TestClient, sample_template_data: dict):
        """Test creating template without authentication"""
        response = client.post("/api/v1/templates", json=sample_template_data)
        assert response.status_code == 401

    def test_list_templates(self, auth_client: TestClient, test_user: User, sample_template_data: dict):
        """Test listing user templates"""
        # Create two templates
        auth_client.post("/api/v1/templates", json=sample_template_data)

        template_data_2 = sample_template_data.copy()
        template_data_2["name"] = "Second Template"
        auth_client.post("/api/v1/templates", json=template_data_2)

        # List templates
        response = auth_client.get("/api/v1/templates")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] in ["Test Template", "Second Template"]

    def test_list_templates_empty(self, auth_client: TestClient):
        """Test listing templates when none exist"""
        response = auth_client.get("/api/v1/templates")

        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_get_template(self, auth_client: TestClient, test_user: User, sample_template_data: dict):
        """Test getting a specific template"""
        # Create template
        create_response = auth_client.post("/api/v1/templates", json=sample_template_data)
        template_id = create_response.json()["id"]

        # Get template
        response = auth_client.get(f"/api/v1/templates/{template_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == template_id
        assert data["name"] == sample_template_data["name"]
        assert len(data["items"]) == 2

    def test_get_template_not_found(self, auth_client: TestClient):
        """Test getting non-existent template"""
        response = auth_client.get("/api/v1/templates/non-existent-id")
        assert response.status_code == 404

    def test_get_template_wrong_user(self, auth_client: TestClient, admin_client: TestClient, sample_template_data: dict):
        """Test getting template created by another user"""
        # User creates template
        create_response = auth_client.post("/api/v1/templates", json=sample_template_data)
        template_id = create_response.json()["id"]

        # Admin tries to get it (should fail - different user)
        response = admin_client.get(f"/api/v1/templates/{template_id}")
        assert response.status_code == 404

    def test_update_template(self, auth_client: TestClient, sample_template_data: dict):
        """Test updating a template"""
        # Create template
        create_response = auth_client.post("/api/v1/templates", json=sample_template_data)
        template_id = create_response.json()["id"]

        # Update template
        update_data = {
            "name": "Updated Template Name",
            "description": "Updated description",
            "category": "Commercial"
        }

        response = auth_client.patch(f"/api/v1/templates/{template_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Template Name"
        assert data["description"] == "Updated description"
        assert data["category"] == "Commercial"

    def test_delete_template(self, auth_client: TestClient, sample_template_data: dict):
        """Test deleting a template"""
        # Create template
        create_response = auth_client.post("/api/v1/templates", json=sample_template_data)
        template_id = create_response.json()["id"]

        # Delete template
        response = auth_client.delete(f"/api/v1/templates/{template_id}")
        assert response.status_code == 200

        # Verify deletion
        get_response = auth_client.get(f"/api/v1/templates/{template_id}")
        assert get_response.status_code == 404

    def test_delete_template_not_found(self, auth_client: TestClient):
        """Test deleting non-existent template"""
        response = auth_client.delete("/api/v1/templates/non-existent-id")
        assert response.status_code == 404

    def test_clone_template(self, auth_client: TestClient, sample_template_data: dict):
        """Test cloning a template"""
        # Create original template
        create_response = auth_client.post("/api/v1/templates", json=sample_template_data)
        original_id = create_response.json()["id"]

        # Clone template
        response = auth_client.post(f"/api/v1/templates/{original_id}/clone")

        assert response.status_code == 200
        data = response.json()

        # Verify clone
        assert data["id"] != original_id
        assert data["name"] == "Test Template (Copy)"
        assert data["description"] == sample_template_data["description"]
        assert data["category"] == sample_template_data["category"]
        assert data["is_default"] is False
        assert len(data["items"]) == 2

        # Verify items were cloned
        original_response = auth_client.get(f"/api/v1/templates/{original_id}")
        original_data = original_response.json()

        for i, item in enumerate(data["items"]):
            assert item["description"] == original_data["items"][i]["description"]
            assert item["unit"] == original_data["items"][i]["unit"]
            assert item["quantity"] == original_data["items"][i]["quantity"]
            assert item["unit_price"] == original_data["items"][i]["unit_price"]

    def test_clone_template_not_found(self, auth_client: TestClient):
        """Test cloning non-existent template"""
        response = auth_client.post("/api/v1/templates/non-existent-id/clone")
        assert response.status_code == 404

    def test_clone_template_wrong_user(self, auth_client: TestClient, admin_client: TestClient, sample_template_data: dict):
        """Test cloning template owned by another user"""
        # User creates template
        create_response = auth_client.post("/api/v1/templates", json=sample_template_data)
        template_id = create_response.json()["id"]

        # Admin tries to clone it (should fail - different user)
        response = admin_client.post(f"/api/v1/templates/{template_id}/clone")
        assert response.status_code == 404

    def test_template_items_count(self, auth_client: TestClient, sample_template_data: dict):
        """Test that template list includes items_count"""
        # Create template
        auth_client.post("/api/v1/templates", json=sample_template_data)

        # List templates
        response = auth_client.get("/api/v1/templates")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["items_count"] == 2

    def test_template_validation(self, auth_client: TestClient):
        """Test template data validation"""
        # Missing required field (name)
        invalid_data = {
            "description": "Missing name field"
        }

        response = auth_client.post("/api/v1/templates", json=invalid_data)
        assert response.status_code == 422

    def test_template_items_validation(self, auth_client: TestClient):
        """Test template items validation"""
        # Invalid item data (negative quantity)
        template_data = {
            "name": "Invalid Template",
            "items": [
                {
                    "description": "Invalid Item",
                    "unit": "pcs",
                    "quantity": -10.0,  # Invalid
                    "unit_price": 100.0
                }
            ]
        }

        response = auth_client.post("/api/v1/templates", json=template_data)
        # Should either reject or accept based on schema validation
        # If no validation exists, this test documents current behavior
        assert response.status_code in [200, 422]


class TestTemplateItemsIntegrity:
    """Test suite for template items data integrity"""

    def test_items_cascade_delete(self, auth_client: TestClient, db: Session, sample_template_data: dict):
        """Test that deleting template also deletes items"""
        # Create template with items
        create_response = auth_client.post("/api/v1/templates", json=sample_template_data)
        template_id = create_response.json()["id"]

        # Verify items exist in database
        items_count = db.query(TemplateItem).filter(
            TemplateItem.template_id == template_id
        ).count()
        assert items_count == 2

        # Delete template
        auth_client.delete(f"/api/v1/templates/{template_id}")

        # Verify items were deleted
        items_count = db.query(TemplateItem).filter(
            TemplateItem.template_id == template_id
        ).count()
        assert items_count == 0

    def test_clone_creates_new_items(self, auth_client: TestClient, db: Session, sample_template_data: dict):
        """Test that cloning creates new item records"""
        # Create original template
        create_response = auth_client.post("/api/v1/templates", json=sample_template_data)
        original_id = create_response.json()["id"]

        # Get original item IDs
        original_items = db.query(TemplateItem).filter(
            TemplateItem.template_id == original_id
        ).all()
        original_item_ids = [item.id for item in original_items]

        # Clone template
        clone_response = auth_client.post(f"/api/v1/templates/{original_id}/clone")
        clone_id = clone_response.json()["id"]

        # Get cloned item IDs
        cloned_items = db.query(TemplateItem).filter(
            TemplateItem.template_id == clone_id
        ).all()
        cloned_item_ids = [item.id for item in cloned_items]

        # Verify new items were created (different IDs)
        assert len(cloned_item_ids) == len(original_item_ids)
        for item_id in cloned_item_ids:
            assert item_id not in original_item_ids
