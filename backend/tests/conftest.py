"""
Pytest configuration and fixtures for backend API tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.config.database import get_db
from src.models.database import Base


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def test_db():
    """Create test database tables"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Create test client with test database"""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_department(test_db):
    """Create a sample department for testing"""
    from src.models.database import Department
    db = TestingSessionLocal()
    try:
        department = Department(name="Test Department", code="TEST")
        db.add(department)
        db.commit()
        db.refresh(department)
        return {
            "id": department.id,
            "name": department.name,
            "code": department.code,
        }
    finally:
        db.close()


@pytest.fixture
def sample_project(test_db, sample_department):
    """Create a sample project for testing"""
    from src.models.database import Project
    db = TestingSessionLocal()
    try:
        project = Project(
            name="Test Project",
            code="PROJ001",
            department_id=sample_department["id"]
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return {
            "id": project.id,
            "name": project.name,
            "code": project.code,
            "department_id": project.department_id,
        }
    finally:
        db.close()


@pytest.fixture
def sample_forecast(client, sample_department, sample_project):
    """Create a sample forecast for testing"""
    response = client.post(
        "/api/forecasts",
        json={
            "department_id": sample_department["id"],
            "project_id": sample_project["id"],
            "project_name": "Test Forecast Project",
            "profit_center": "PC-TEST-001",
            "wbs": "WBS-TEST-001",
            "account": "5000",
            "jan": 100000,
            "feb": 150000,
            "mar": 200000,
            "apr": 180000,
            "may": 160000,
            "jun": 140000,
            "jul": 120000,
            "aug": 130000,
            "sep": 140000,
            "oct": 150000,
            "nov": 160000,
            "dec": 170000,
            "total": 1800000,
            "yearly_sum": 1800000,
            "time_period": "2026",
            "period_type": "monthly",
            "description": "Test forecast",
            "created_by": "test-user",
        },
    )
    return response.json()
