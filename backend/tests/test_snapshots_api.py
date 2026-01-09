"""
API Integration Tests: Snapshots Endpoints
Tests snapshot creation and approval workflow
"""
import pytest
from fastapi import status


class TestSnapshotsAPI:
    """Test cases for Snapshots API endpoints"""

    def test_create_snapshot(self, client, sample_forecast):
        """Test creating a snapshot from a forecast"""
        payload = {
            "forecast_id": sample_forecast["id"],
            "submitted_by": "test-approver",
        }

        response = client.post("/api/snapshots", json=payload)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        assert data["forecast_id"] == sample_forecast["id"]
        assert data["submitted_by"] == "test-approver"
        assert data["is_approved"] is False
        assert "snapshot_date" in data
        assert data["project_name"] == sample_forecast["project_name"]
        assert data["wbs"] == sample_forecast["wbs"]

    def test_get_all_snapshots(self, client, sample_forecast):
        """Test retrieving all snapshots"""
        # Create a snapshot first
        client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )

        response = client.get("/api/snapshots")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_snapshot_by_id(self, client, sample_forecast):
        """Test retrieving a specific snapshot by ID"""
        # Create snapshot
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )
        snapshot_id = create_response.json()["id"]

        response = client.get(f"/api/snapshots/{snapshot_id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == snapshot_id
        assert data["forecast_id"] == sample_forecast["id"]

    def test_get_nonexistent_snapshot(self, client):
        """Test retrieving a snapshot that doesn't exist"""
        response = client.get("/api/snapshots/99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_approve_snapshot(self, client, sample_forecast):
        """Test approving a snapshot"""
        # Create snapshot
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )
        snapshot_id = create_response.json()["id"]

        # Approve snapshot
        response = client.post(
            f"/api/snapshots/{snapshot_id}/approve",
            json={"approved_by": "approver-user"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["is_approved"] is True
        assert data["approved_by"] == "approver-user"
        assert "approved_at" in data
        assert data["approved_at"] is not None

    def test_approve_nonexistent_snapshot(self, client):
        """Test approving a snapshot that doesn't exist"""
        response = client.post(
            "/api/snapshots/99999/approve",
            json={"approved_by": "approver-user"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_snapshot(self, client, sample_forecast):
        """Test deleting a snapshot"""
        # Create snapshot
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )
        snapshot_id = create_response.json()["id"]

        # Delete snapshot
        response = client.delete(f"/api/snapshots/{snapshot_id}")

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify snapshot no longer exists
        get_response = client.get(f"/api/snapshots/{snapshot_id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_nonexistent_snapshot(self, client):
        """Test deleting a snapshot that doesn't exist"""
        response = client.delete("/api/snapshots/99999")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_snapshot_preserves_forecast_data(self, client, sample_forecast):
        """Test that snapshot preserves all forecast data at time of creation"""
        # Create snapshot
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )
        snapshot = create_response.json()

        # Verify all monthly values are preserved
        assert snapshot["jan"] == sample_forecast["jan"]
        assert snapshot["feb"] == sample_forecast["feb"]
        assert snapshot["mar"] == sample_forecast["mar"]
        assert snapshot["apr"] == sample_forecast["apr"]
        assert snapshot["may"] == sample_forecast["may"]
        assert snapshot["jun"] == sample_forecast["jun"]
        assert snapshot["jul"] == sample_forecast["jul"]
        assert snapshot["aug"] == sample_forecast["aug"]
        assert snapshot["sep"] == sample_forecast["sep"]
        assert snapshot["oct"] == sample_forecast["oct"]
        assert snapshot["nov"] == sample_forecast["nov"]
        assert snapshot["dec"] == sample_forecast["dec"]
        assert snapshot["total"] == sample_forecast["total"]
        assert snapshot["yearly_sum"] == sample_forecast["yearly_sum"]

    def test_snapshot_immutable_after_forecast_update(self, client, sample_forecast):
        """Test that snapshot data doesn't change when original forecast is updated"""
        # Create snapshot
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )
        snapshot_id = create_response.json()["id"]
        original_jan = create_response.json()["jan"]

        # Update original forecast
        update_payload = {
            **sample_forecast,
            "jan": 500000,  # Changed value
            "total": 2200000,
        }
        client.put(f"/api/forecasts/{sample_forecast['id']}", json=update_payload)

        # Verify snapshot data unchanged
        snapshot_response = client.get(f"/api/snapshots/{snapshot_id}")
        snapshot_data = snapshot_response.json()

        assert snapshot_data["jan"] == original_jan  # Should still be original value
        assert snapshot_data["jan"] != 500000  # Should NOT be updated value

    def test_create_multiple_snapshots_from_same_forecast(self, client, sample_forecast):
        """Test creating multiple snapshots from the same forecast"""
        # Create first snapshot
        response1 = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "user1"},
        )
        assert response1.status_code == status.HTTP_201_CREATED
        snapshot1_id = response1.json()["id"]

        # Create second snapshot
        response2 = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "user2"},
        )
        assert response2.status_code == status.HTTP_201_CREATED
        snapshot2_id = response2.json()["id"]

        # Verify both snapshots exist and have different IDs
        assert snapshot1_id != snapshot2_id

        # Get all snapshots and verify both exist
        all_snapshots = client.get("/api/snapshots").json()
        snapshot_ids = [s["id"] for s in all_snapshots]

        assert snapshot1_id in snapshot_ids
        assert snapshot2_id in snapshot_ids

    def test_snapshot_approval_workflow(self, client, sample_forecast):
        """Test complete approval workflow"""
        # 1. Create snapshot (submit for approval)
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "submitter"},
        )
        snapshot_id = create_response.json()["id"]

        # 2. Verify snapshot is not approved initially
        get_response = client.get(f"/api/snapshots/{snapshot_id}")
        assert get_response.json()["is_approved"] is False
        assert get_response.json()["approved_by"] is None

        # 3. Approve snapshot
        approve_response = client.post(
            f"/api/snapshots/{snapshot_id}/approve",
            json={"approved_by": "approver"},
        )
        assert approve_response.status_code == status.HTTP_200_OK

        # 4. Verify snapshot is approved
        final_response = client.get(f"/api/snapshots/{snapshot_id}")
        final_data = final_response.json()

        assert final_data["is_approved"] is True
        assert final_data["approved_by"] == "approver"
        assert final_data["approved_at"] is not None

    def test_snapshot_with_nonexistent_forecast(self, client):
        """Test creating a snapshot with non-existent forecast ID"""
        payload = {
            "forecast_id": 99999,  # Non-existent
            "submitted_by": "test-user",
        }

        response = client.post("/api/snapshots", json=payload)

        # Should return error
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        ]

    def test_snapshot_timestamps(self, client, sample_forecast):
        """Test that snapshot timestamps are set correctly"""
        # Create snapshot
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )

        data = create_response.json()

        assert "snapshot_date" in data
        assert data["snapshot_date"] is not None

    def test_approve_already_approved_snapshot(self, client, sample_forecast):
        """Test approving a snapshot that's already approved"""
        # Create and approve snapshot
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )
        snapshot_id = create_response.json()["id"]

        client.post(
            f"/api/snapshots/{snapshot_id}/approve",
            json={"approved_by": "approver1"},
        )

        # Try to approve again
        response = client.post(
            f"/api/snapshots/{snapshot_id}/approve",
            json={"approved_by": "approver2"},
        )

        # Should either succeed (update approver) or return error
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
        ]

    def test_delete_approved_snapshot(self, client, sample_forecast):
        """Test that approved snapshots can be deleted"""
        # Create and approve snapshot
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )
        snapshot_id = create_response.json()["id"]

        client.post(
            f"/api/snapshots/{snapshot_id}/approve",
            json={"approved_by": "approver"},
        )

        # Delete approved snapshot
        response = client.delete(f"/api/snapshots/{snapshot_id}")

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_snapshot_department_and_project_info(self, client, sample_forecast, sample_department, sample_project):
        """Test that snapshot preserves department and project information"""
        create_response = client.post(
            "/api/snapshots",
            json={"forecast_id": sample_forecast["id"], "submitted_by": "test-user"},
        )

        snapshot = create_response.json()

        assert snapshot["department_id"] == sample_department["id"]
        assert snapshot["project_id"] == sample_project["id"]
        assert snapshot["project_name"] == sample_forecast["project_name"]
