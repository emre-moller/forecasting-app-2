from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.models import schemas
from src.repositories.forecast_repository import ForecastRepository, ForecastSnapshotRepository

router = APIRouter(prefix="/api/snapshots", tags=["snapshots"])


@router.get("", response_model=List[schemas.ForecastSnapshot])
def get_snapshots(db: Session = Depends(get_db)):
    """Get all forecast snapshots"""
    repo = ForecastSnapshotRepository(db)
    return repo.get_all()


@router.post("", response_model=schemas.ForecastSnapshot, status_code=201)
def create_snapshot(
    snapshot_data: schemas.ForecastSnapshotCreate,
    db: Session = Depends(get_db)
):
    """Create a snapshot from a forecast (submit for approval) - DEPRECATED: Use bulk endpoint instead"""
    from datetime import UTC, datetime
    from uuid import uuid4

    forecast_repo = ForecastRepository(db)
    snapshot_repo = ForecastSnapshotRepository(db)

    # Verify the forecast exists using the composite key
    forecast = forecast_repo.get_by_id(snapshot_data.forecast_id)
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")

    # Generate a batch ID (single item batch)
    dept_id = forecast.department_id or 0
    batch_id = f"{dept_id}_{int(datetime.now(UTC).timestamp())}_{uuid4().hex[:8]}"

    # Create the snapshot using the forecast_key
    try:
        snapshot = snapshot_repo.create_from_forecast(
            forecast_key=snapshot_data.forecast_id,
            submitted_by=snapshot_data.submitted_by,
            batch_id=batch_id
        )
        return snapshot
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk", response_model=List[schemas.ForecastSnapshot], status_code=201)
def create_bulk_snapshots(
    snapshot_data: schemas.BulkSnapshotCreate,
    db: Session = Depends(get_db)
):
    """Create snapshots for all forecasts in a department"""
    snapshot_repo = ForecastSnapshotRepository(db)

    try:
        snapshots = snapshot_repo.create_bulk_snapshots(
            department_id=snapshot_data.department_id,
            submitted_by=snapshot_data.submitted_by
        )
        return snapshots
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{snapshot_id}", response_model=schemas.ForecastSnapshot)
def get_snapshot(snapshot_id: str, db: Session = Depends(get_db)):
    """Get a specific snapshot by snapshot_id (string)"""
    repo = ForecastSnapshotRepository(db)
    snapshot = repo.get_by_id(snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot


@router.post("/{snapshot_id}/approve", response_model=schemas.ForecastSnapshot)
def approve_snapshot(
    snapshot_id: str,
    approval_data: schemas.ForecastSnapshotApprove,
    db: Session = Depends(get_db)
):
    """Approve a snapshot by snapshot_id (string)"""
    repo = ForecastSnapshotRepository(db)
    snapshot = repo.approve(snapshot_id, approval_data.approved_by)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot


@router.delete("/{snapshot_id}", status_code=204)
def delete_snapshot(snapshot_id: str, db: Session = Depends(get_db)):
    """Delete a snapshot by snapshot_id (string)"""
    repo = ForecastSnapshotRepository(db)
    if not repo.delete(snapshot_id):
        raise HTTPException(status_code=404, detail="Snapshot not found")
