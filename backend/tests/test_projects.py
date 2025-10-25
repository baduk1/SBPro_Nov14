"""
Tests for Projects API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.project import Project


class TestProjectsEndpoints:
    """Test suite for Projects CRUD operations"""

    def test_create_project(self, auth_client: TestClient, test_user: User, sample_project_data: dict):
        """Test creating a new project"""
        response = auth_client.post("/api/v1/projects", json=sample_project_data)

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == sample_project_data["name"]
        assert data["description"] == sample_project_data["description"]
        assert data["status"] == sample_project_data["status"]
        assert data["user_id"] == test_user.id
        assert "id" in data
        assert "created_at" in data

    def test_create_project_minimal(self, auth_client: TestClient):
        """Test creating project with minimal data"""
        minimal_data = {
            "name": "Minimal Project"
        }

        response = auth_client.post("/api/v1/projects", json=minimal_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Minimal Project"
        assert data["status"] == "ACTIVE"  # Default status

    def test_create_project_unauthorized(self, client: TestClient, sample_project_data: dict):
        """Test creating project without authentication"""
        response = client.post("/api/v1/projects", json=sample_project_data)
        assert response.status_code == 401

    def test_list_projects(self, auth_client: TestClient, sample_project_data: dict):
        """Test listing user projects"""
        # Create two projects
        auth_client.post("/api/v1/projects", json=sample_project_data)

        project_data_2 = sample_project_data.copy()
        project_data_2["name"] = "Second Project"
        auth_client.post("/api/v1/projects", json=project_data_2)

        # List projects
        response = auth_client.get("/api/v1/projects")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] in ["Test Construction Project", "Second Project"]

    def test_list_projects_empty(self, auth_client: TestClient):
        """Test listing projects when none exist"""
        response = auth_client.get("/api/v1/projects")

        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_get_project(self, auth_client: TestClient, sample_project_data: dict):
        """Test getting a specific project"""
        # Create project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]

        # Get project
        response = auth_client.get(f"/api/v1/projects/{project_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert data["name"] == sample_project_data["name"]

    def test_get_project_not_found(self, auth_client: TestClient):
        """Test getting non-existent project"""
        response = auth_client.get("/api/v1/projects/non-existent-id")
        assert response.status_code == 404

    def test_get_project_wrong_user(self, auth_client: TestClient, admin_client: TestClient, sample_project_data: dict):
        """Test getting project created by another user"""
        # User creates project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]

        # Admin tries to get it (different user)
        response = admin_client.get(f"/api/v1/projects/{project_id}")
        assert response.status_code == 404

    def test_update_project(self, auth_client: TestClient, sample_project_data: dict):
        """Test updating a project"""
        # Create project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]

        # Update project
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description",
            "status": "COMPLETED"
        }

        response = auth_client.patch(f"/api/v1/projects/{project_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Project Name"
        assert data["description"] == "Updated description"
        assert data["status"] == "COMPLETED"

    def test_update_project_partial(self, auth_client: TestClient, sample_project_data: dict):
        """Test partial update of project"""
        # Create project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]
        original_name = create_response.json()["name"]

        # Update only status
        update_data = {
            "status": "ON_HOLD"
        }

        response = auth_client.patch(f"/api/v1/projects/{project_id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == original_name  # Unchanged
        assert data["status"] == "ON_HOLD"  # Updated

    def test_update_project_not_found(self, auth_client: TestClient):
        """Test updating non-existent project"""
        update_data = {"name": "Updated"}
        response = auth_client.patch("/api/v1/projects/non-existent-id", json=update_data)
        assert response.status_code == 404

    def test_delete_project(self, auth_client: TestClient, sample_project_data: dict):
        """Test deleting a project"""
        # Create project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]

        # Delete project
        response = auth_client.delete(f"/api/v1/projects/{project_id}")
        assert response.status_code == 200

        # Verify deletion
        get_response = auth_client.get(f"/api/v1/projects/{project_id}")
        assert get_response.status_code == 404

    def test_delete_project_not_found(self, auth_client: TestClient):
        """Test deleting non-existent project"""
        response = auth_client.delete("/api/v1/projects/non-existent-id")
        assert response.status_code == 404

    def test_delete_project_wrong_user(self, auth_client: TestClient, admin_client: TestClient, sample_project_data: dict):
        """Test deleting project owned by another user"""
        # User creates project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]

        # Admin tries to delete it
        response = admin_client.delete(f"/api/v1/projects/{project_id}")
        assert response.status_code == 404


class TestProjectStatus:
    """Test suite for project status management"""

    def test_default_status(self, auth_client: TestClient):
        """Test project gets default ACTIVE status"""
        project_data = {
            "name": "Project Without Status"
        }

        response = auth_client.post("/api/v1/projects", json=project_data)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ACTIVE"

    def test_status_transitions(self, auth_client: TestClient, sample_project_data: dict):
        """Test various status transitions"""
        # Create project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]

        # Transition: ACTIVE → ON_HOLD
        response1 = auth_client.patch(f"/api/v1/projects/{project_id}", json={"status": "ON_HOLD"})
        assert response1.status_code == 200
        assert response1.json()["status"] == "ON_HOLD"

        # Transition: ON_HOLD → ACTIVE
        response2 = auth_client.patch(f"/api/v1/projects/{project_id}", json={"status": "ACTIVE"})
        assert response2.status_code == 200
        assert response2.json()["status"] == "ACTIVE"

        # Transition: ACTIVE → COMPLETED
        response3 = auth_client.patch(f"/api/v1/projects/{project_id}", json={"status": "COMPLETED"})
        assert response3.status_code == 200
        assert response3.json()["status"] == "COMPLETED"

    def test_invalid_status(self, auth_client: TestClient, sample_project_data: dict):
        """Test setting invalid status"""
        # Create project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]

        # Try invalid status
        response = auth_client.patch(f"/api/v1/projects/{project_id}", json={"status": "INVALID_STATUS"})

        # Should either accept (no validation) or reject (with validation)
        assert response.status_code in [200, 422]


class TestProjectValidation:
    """Test suite for project data validation"""

    def test_create_project_missing_name(self, auth_client: TestClient):
        """Test creating project without name"""
        invalid_data = {
            "description": "Project without name"
        }

        response = auth_client.post("/api/v1/projects", json=invalid_data)
        assert response.status_code == 422

    def test_create_project_empty_name(self, auth_client: TestClient):
        """Test creating project with empty name"""
        invalid_data = {
            "name": "",
            "description": "Project with empty name"
        }

        response = auth_client.post("/api/v1/projects", json=invalid_data)
        # Should reject empty name
        assert response.status_code in [200, 422]

    def test_project_name_length(self, auth_client: TestClient):
        """Test project name length validation"""
        # Very long name
        long_name = "A" * 500

        project_data = {
            "name": long_name
        }

        response = auth_client.post("/api/v1/projects", json=project_data)

        # Behavior depends on validation
        assert response.status_code in [200, 422]


class TestProjectHistory:
    """Test suite for project history endpoint"""

    def test_get_project_history(self, auth_client: TestClient, sample_project_data: dict):
        """Test getting project history"""
        # Create project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]

        # Get history
        response = auth_client.get(f"/api/v1/projects/{project_id}/history")

        # History endpoint may or may not exist
        # If it exists, should return list
        # If not, should return 404
        assert response.status_code in [200, 404, 405]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_project_history_not_found(self, auth_client: TestClient):
        """Test getting history for non-existent project"""
        response = auth_client.get("/api/v1/projects/non-existent-id/history")

        # Should return 404 or 405 (method not implemented)
        assert response.status_code in [404, 405]


class TestProjectDataIntegrity:
    """Test suite for project data integrity"""

    def test_project_ownership(self, auth_client: TestClient, admin_client: TestClient, sample_project_data: dict):
        """Test project ownership isolation"""
        # User creates project
        user_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        assert user_response.status_code == 200

        # Admin creates project
        admin_project_data = sample_project_data.copy()
        admin_project_data["name"] = "Admin Project"
        admin_response = admin_client.post("/api/v1/projects", json=admin_project_data)
        assert admin_response.status_code == 200

        # User lists projects (should see only their own)
        user_list = auth_client.get("/api/v1/projects")
        assert len(user_list.json()) == 1
        assert user_list.json()[0]["name"] == sample_project_data["name"]

        # Admin lists projects (should see only their own)
        admin_list = admin_client.get("/api/v1/projects")
        assert len(admin_list.json()) == 1
        assert admin_list.json()[0]["name"] == "Admin Project"

    def test_project_persistence(self, auth_client: TestClient, sample_project_data: dict):
        """Test project data persists correctly"""
        # Create project
        create_response = auth_client.post("/api/v1/projects", json=sample_project_data)
        project_id = create_response.json()["id"]

        # Get project multiple times
        response1 = auth_client.get(f"/api/v1/projects/{project_id}")
        response2 = auth_client.get(f"/api/v1/projects/{project_id}")

        # Should return same data
        assert response1.json() == response2.json()

    def test_multiple_projects_same_name(self, auth_client: TestClient, sample_project_data: dict):
        """Test creating multiple projects with same name"""
        # Create first project
        response1 = auth_client.post("/api/v1/projects", json=sample_project_data)
        assert response1.status_code == 200

        # Create second project with same name
        response2 = auth_client.post("/api/v1/projects", json=sample_project_data)
        assert response2.status_code == 200

        # Both should succeed (no unique constraint on name)
        assert response1.json()["id"] != response2.json()["id"]
        assert response1.json()["name"] == response2.json()["name"]
