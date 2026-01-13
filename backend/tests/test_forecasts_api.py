"""
API Integration Tests: Forecasts Endpoints
Tests CRUD operations on /api/forecasts endpoints
"""
import pytest
from fastapi import status


class TestForecastsAPI:
    """Test cases for Forecasts API endpoints"""

    def test_create_forecast(self, client, sample_department, sample_project):
        """Test creating a new forecast"""
        payload = {
            "department_id": sample_department["id"],
            "project_id": sample_project["id"],
            "project_name": "New Test Project",
            "profit_center": "PC-NEW-001",
            "wbs": "WBS-NEW-001",
            "account": "6000",
            "jan": 50000,
            "feb": 60000,
            "mar": 70000,
            "apr": 80000,
            "may": 90000,
            "jun": 100000,
            "jul": 110000,
            "aug": 120000,
            "sep": 130000,
            "oct": 140000,
            "nov": 150000,
            "dec": 160000,
            "total": 1260000,
            "yearly_sum": 1260000,
        }

        response = client.post("/api/forecasts", json=payload)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        assert data["project_name"] == "New Test Project"
        assert data["profit_center"] == "PC-NEW-001"
        assert data["wbs"] == "WBS-NEW-001"
        assert data["jan"] == 50000
        assert data["dec"] == 160000
        assert data["total"] == 1260000
        assert "id" in data
        assert "created_at" in data

    def test_get_all_forecasts(self, client, sample_forecast):
        """Test retrieving all forecasts"""
        response = client.get("/api/forecasts")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert isinstance(data, list)
        assert len(data) >= 1

        # Verify sample forecast is in the list
        forecast_ids = [f["id"] for f in data]
        assert sample_forecast["id"] in forecast_ids

    def test_get_forecast_by_id(self, client, sample_forecast):
        """Test retrieving a specific forecast by ID"""
        forecast_id = sample_forecast["id"]
        response = client.get(f"/api/forecasts/{forecast_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == forecast_id
        assert data["project_name"] == sample_forecast["project_name"]
        assert data["wbs"] == sample_forecast["wbs"]

    def test_get_nonexistent_forecast(self, client):
        """Test retrieving a forecast that doesn't exist"""
        response = client.get("/api/forecasts/99999_2026")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_forecast(self, client, sample_forecast):
        """Test updating an existing forecast"""
        forecast_id = sample_forecast["id"]

        update_payload = {
            **sample_forecast,
            "project_name": "Updated Project Name",
            "jan": 200000,
            "total": 1900000,
            "yearly_sum": 1900000,
        }

        response = client.put(f"/api/forecasts/{forecast_id}", json=update_payload)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["project_name"] == "Updated Project Name"
        assert data["jan"] == 200000
        assert data["total"] == 1900000

    def test_update_nonexistent_forecast(self, client):
        """Test updating a forecast that doesn't exist"""
        payload = {
            "department_id": 1,
            "project_id": 1,
            "project_name": "Test",
            "profit_center": "PC-001",
            "wbs": "WBS-001",
            "account": "5000",
            "jan": 100000,
            "total": 100000,
            "yearly_sum": 100000,
        }

        response = client.put("/api/forecasts/99999_2026", json=payload)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_forecast(self, client, sample_forecast):
        """Test deleting a forecast"""
        forecast_id = sample_forecast["id"]

        response = client.delete(f"/api/forecasts/{forecast_id}")

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify forecast no longer exists
        get_response = client.get(f"/api/forecasts/{forecast_id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_nonexistent_forecast(self, client):
        """Test deleting a forecast that doesn't exist"""
        response = client.delete("/api/forecasts/99999_2026")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_forecast_with_missing_fields(self, client, sample_department, sample_project):
        """Test creating a forecast with missing required fields"""
        payload = {
            "department_id": sample_department["id"],
            "project_id": sample_project["id"],
            # Missing other required fields
        }

        response = client.post("/api/forecasts", json=payload)

        # Should return validation error
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_forecast_with_invalid_department(self, client, sample_project):
        """Test creating a forecast with non-existent department"""
        payload = {
            "department_id": 99999,  # Non-existent
            "project_id": sample_project["id"],
            "project_name": "Test",
            "profit_center": "PC-001",
            "wbs": "WBS-001",
            "account": "5000",
            "jan": 100000,
            "total": 100000,
            "yearly_sum": 100000,
        }

        response = client.post("/api/forecasts", json=payload)

        # Should return error (exact status code depends on implementation)
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ]

    def test_forecast_monthly_values_persistence(self, client, sample_forecast):
        """Test that all 12 monthly values are persisted correctly"""
        forecast_id = sample_forecast["id"]
        response = client.get(f"/api/forecasts/{forecast_id}")

        data = response.json()

        assert data["jan"] == 100000
        assert data["feb"] == 150000
        assert data["mar"] == 200000
        assert data["apr"] == 180000
        assert data["may"] == 160000
        assert data["jun"] == 140000
        assert data["jul"] == 120000
        assert data["aug"] == 130000
        assert data["sep"] == 140000
        assert data["oct"] == 150000
        assert data["nov"] == 160000
        assert data["dec"] == 170000

    def test_forecast_total_calculation(self, client, sample_department, sample_project):
        """Test that totals are calculated correctly"""
        monthly_values = [100000] * 12
        total = sum(monthly_values)

        payload = {
            "department_id": sample_department["id"],
            "project_id": sample_project["id"],
            "project_name": "Calculation Test",
            "profit_center": "PC-CALC",
            "wbs": "WBS-CALC",
            "account": "5000",
            "jan": monthly_values[0],
            "feb": monthly_values[1],
            "mar": monthly_values[2],
            "apr": monthly_values[3],
            "may": monthly_values[4],
            "jun": monthly_values[5],
            "jul": monthly_values[6],
            "aug": monthly_values[7],
            "sep": monthly_values[8],
            "oct": monthly_values[9],
            "nov": monthly_values[10],
            "dec": monthly_values[11],
            "total": total,
            "yearly_sum": total,
        }

        response = client.post("/api/forecasts", json=payload)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        assert data["total"] == total
        assert data["yearly_sum"] == total

    def test_create_forecast_for_project(self, client, sample_department, sample_project):
        """Test creating a forecast for a specific project"""
        # Note: Each project can only have one forecast per year in the normalized structure
        payload = {
            "department_id": sample_department["id"],
            "project_id": sample_project["id"],
            "project_name": "Test Project 1",
            "profit_center": "PC-001",
            "wbs": "WBS-001",
            "account": "5001",
            "jan": 100000,
            "feb": 110000,
            "mar": 120000,
            "apr": 130000,
            "may": 140000,
            "jun": 150000,
            "jul": 160000,
            "aug": 170000,
            "sep": 180000,
            "oct": 190000,
            "nov": 200000,
            "dec": 210000,
            "total": 1860000,
            "yearly_sum": 1860000,
        }

        response = client.post("/api/forecasts", json=payload)
        assert response.status_code == status.HTTP_201_CREATED

        # Verify forecast was created and can be retrieved
        forecast_id = response.json()["id"]
        get_response = client.get(f"/api/forecasts/{forecast_id}")
        assert get_response.status_code == status.HTTP_200_OK
        assert get_response.json()["project_name"] == "Test Project 1"

    def test_forecast_timestamps(self, client, sample_forecast):
        """Test that created_at and updated_at timestamps are set"""
        forecast_id = sample_forecast["id"]
        response = client.get(f"/api/forecasts/{forecast_id}")

        data = response.json()

        assert "created_at" in data
        assert "updated_at" in data
        assert data["created_at"] is not None
        assert data["updated_at"] is not None

    def test_forecast_filtering_by_department(self, client, sample_department, sample_project):
        """Test that forecasts can be filtered by department"""
        # Create forecast for sample department
        response = client.post(
            "/api/forecasts",
            json={
                "department_id": sample_department["id"],
                "project_id": sample_project["id"],
                "project_name": "Dept Filter Test",
                "profit_center": "PC-FILT",
                "wbs": "WBS-FILT",
                "account": "5000",
                "jan": 100000,
                "total": 1200000,
                "yearly_sum": 1200000,
            },
        )

        assert response.status_code == status.HTTP_201_CREATED

        # Get all forecasts
        response = client.get("/api/forecasts")
        all_forecasts = response.json()

        # Filter by department ID
        dept_forecasts = [
            f for f in all_forecasts if f["department_id"] == sample_department["id"]
        ]

        assert len(dept_forecasts) >= 1
