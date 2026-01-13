from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.models import schemas
from src.repositories.forecast_repository import ForecastRepository, ForecastSnapshotRepository
from src.services.forecast_transformation import decode_forecast_id

router = APIRouter(prefix="/api/snapshots", tags=["snapshots"])


@router.get("", response_model=List[schemas.ForecastSnapshot])
def get_snapshots(db: Session = Depends(get_db)):
    """Get all forecast snapshots"""
    repo = ForecastSnapshotRepository(db)
    return repo.get_all()


@router.get("/{snapshot_id}", response_model=schemas.ForecastSnapshot)
def get_snapshot(snapshot_id: int, db: Session = Depends(get_db)):
    """Get a specific snapshot by ID"""
    repo = ForecastSnapshotRepository(db)
    snapshot = repo.get_by_id(snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot


@router.post("", response_model=schemas.ForecastSnapshot, status_code=201)
def create_snapshot(
    snapshot_data: schemas.ForecastSnapshotCreate,
    db: Session = Depends(get_db)
):
    """Create a snapshot from a forecast (submit for approval)"""
    forecast_repo = ForecastRepository(db)
    snapshot_repo = ForecastSnapshotRepository(db)

    # Decode forecast_id to get project_id and year
    try:
        project_id, year = decode_forecast_id(snapshot_data.forecast_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid forecast_id format")

    # Verify the forecast exists
    forecast = forecast_repo.get_by_id(snapshot_data.forecast_id)
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")

    # Create the snapshot from project_id and year
    snapshot = snapshot_repo.create_from_forecast(
        project_id=project_id,
        year=year,
        submitted_by=snapshot_data.submitted_by
    )
    return snapshot


@router.post("/{snapshot_id}/approve", response_model=schemas.ForecastSnapshot)
def approve_snapshot(
    snapshot_id: int,
    approval_data: schemas.ForecastSnapshotApprove,
    db: Session = Depends(get_db)
):
    """Approve a snapshot"""
    repo = ForecastSnapshotRepository(db)
    snapshot = repo.approve(snapshot_id, approval_data.approved_by)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot


@router.delete("/{snapshot_id}", status_code=204)
def delete_snapshot(snapshot_id: int, db: Session = Depends(get_db)):
    """Delete a snapshot"""
    repo = ForecastSnapshotRepository(db)
    if not repo.delete(snapshot_id):
        raise HTTPException(status_code=404, detail="Snapshot not found")
