"""
Test configuration and fixtures for SkyBuild Pro backend
"""
import os
import sys
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.security import get_current_user, get_password_hash
from app.models.user import User

# Test database URL (in-memory SQLite)
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine
engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Create session factory
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Create a fresh database for each test
    """
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create session
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """
    Create test client with database dependency override
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(db: Session) -> User:
    """
    Create a test user
    """
    user = User(
        id="test-user-id-123",
        email="test@example.com",
        hash=get_password_hash("testpassword"),
        full_name="Test User",
        email_verified=True,
        credits_balance=5000,
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def admin_user(db: Session) -> User:
    """
    Create an admin user
    """
    user = User(
        id="admin-user-id-456",
        email="admin@example.com",
        hash=get_password_hash("adminpassword"),
        full_name="Admin User",
        email_verified=True,
        credits_balance=10000,
        role="admin"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def auth_client(client: TestClient, test_user: User) -> TestClient:
    """
    Create authenticated test client
    """
    # Override the get_current_user dependency
    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    return client


@pytest.fixture(scope="function")
def admin_client(client: TestClient, admin_user: User) -> TestClient:
    """
    Create authenticated admin test client
    """
    # Override the get_current_user dependency
    def override_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    return client


@pytest.fixture
def sample_template_data():
    """
    Sample template data for testing
    """
    return {
        "name": "Test Template",
        "description": "A test template for unit testing",
        "category": "Residential",
        "items": [
            {
                "element_type": "Concrete",
                "description": "Concrete Foundation",
                "unit": "m3",
                "default_unit_price": 150.0,
                "quantity_multiplier": 50.0
            },
            {
                "element_type": "Steel",
                "description": "Steel Reinforcement",
                "unit": "kg",
                "default_unit_price": 2.5,
                "quantity_multiplier": 1000.0
            }
        ]
    }


@pytest.fixture
def sample_estimate_data():
    """
    Sample estimate data for testing
    """
    return {
        "name": "Test Estimate",
        "job_id": "job-123",
        "project_id": "project-456",
        "currency": "USD",
        "notes": "Test estimate notes",
        "items": [
            {
                "description": "Labor Cost",
                "element_type": "Labor",
                "unit": "hours",
                "quantity": 100.0,
                "unit_price": 50.0,
                "currency": "USD"
            },
            {
                "description": "Materials",
                "element_type": "Materials",
                "unit": "lot",
                "quantity": 1.0,
                "unit_price": 5000.0,
                "currency": "USD"
            }
        ]
    }


@pytest.fixture
def sample_supplier_data():
    """
    Sample supplier data for testing
    """
    return {
        "name": "Test Supplier Ltd",
        "contact_person": "John Doe",
        "email": "john@testsupplier.com",
        "phone": "+1234567890",
        "address": "123 Test Street",
        "website": "https://testsupplier.com",
        "notes": "Reliable supplier"
    }


@pytest.fixture
def sample_project_data():
    """
    Sample project data for testing
    """
    return {
        "name": "Test Construction Project",
        "description": "A test project for unit testing",
        "status": "ACTIVE"
    }
