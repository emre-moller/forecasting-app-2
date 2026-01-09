"""
API Integration Tests: Departments and Projects Endpoints
Tests for /api/departments and /api/projects endpoints
"""
import pytest
from fastapi import status


class TestDepartmentsAPI:
    """Test cases for Departments API endpoints"""

    def test_get_all_departments(self, client, sample_department):
        """Test retrieving all departments"""
        response = client.get("/api/departments")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_department_by_id(self, client, sample_department):
        """Test retrieving a specific department by ID"""
        dept_id = sample_department["id"]
        response = client.get(f"/api/departments/{dept_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == dept_id
        assert data["name"] == sample_department["name"]
        assert data["code"] == sample_department["code"]

    def test_department_structure(self, client, sample_department):
        """Test that department has expected fields"""
        dept_id = sample_department["id"]
        response = client.get(f"/api/departments/{dept_id}")

        data = response.json()

        assert "id" in data
        assert "name" in data
        assert "code" in data

    def test_get_nonexistent_department(self, client):
        """Test retrieving a department that doesn't exist"""
        response = client.get("/api/departments/99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestProjectsAPI:
    """Test cases for Projects API endpoints"""

    def test_get_all_projects(self, client, sample_project):
        """Test retrieving all projects"""
        response = client.get("/api/projects")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_project_by_id(self, client, sample_project):
        """Test retrieving a specific project by ID"""
        project_id = sample_project["id"]
        response = client.get(f"/api/projects/{project_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == project_id
        assert data["name"] == sample_project["name"]
        assert data["code"] == sample_project["code"]

    def test_project_structure(self, client, sample_project):
        """Test that project has expected fields"""
        project_id = sample_project["id"]
        response = client.get(f"/api/projects/{project_id}")

        data = response.json()

        assert "id" in data
        assert "name" in data
        assert "code" in data
        assert "department_id" in data

    def test_get_nonexistent_project(self, client):
        """Test retrieving a project that doesn't exist"""
        response = client.get("/api/projects/99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_project_department_relationship(self, client, sample_department, sample_project):
        """Test that project is correctly linked to department"""
        project_id = sample_project["id"]
        response = client.get(f"/api/projects/{project_id}")

        data = response.json()

        assert data["department_id"] == sample_department["id"]

    def test_filter_projects_by_department(self, client, sample_department, sample_project):
        """Test filtering projects by department"""
        # Get all projects
        response = client.get("/api/projects")
        all_projects = response.json()

        # Filter by department
        dept_projects = [p for p in all_projects if p["department_id"] == sample_department["id"]]

        assert len(dept_projects) >= 1
        assert sample_project["id"] in [p["id"] for p in dept_projects]
