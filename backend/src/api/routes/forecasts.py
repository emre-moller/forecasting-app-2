from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.models import schemas
from src.models import database
from src.repositories.forecast_repository import ForecastRepository

router = APIRouter(prefix="/api/forecasts", tags=["forecasts"])


@router.get("", response_model=List[schemas.Forecast])
def get_forecasts(db: Session = Depends(get_db)):
    repo = ForecastRepository(db)
    return repo.get_all()


@router.get("/{forecast_id}", response_model=schemas.Forecast)
def get_forecast(forecast_id: int, db: Session = Depends(get_db)):
    repo = ForecastRepository(db)
    forecast = repo.get_by_id(forecast_id)
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    return forecast


@router.post("", response_model=schemas.Forecast, status_code=201)
def create_forecast(
    forecast: schemas.ForecastCreate,
    db: Session = Depends(get_db)
):
    # Validate department exists
    department = db.query(database.Department).filter(database.Department.id == forecast.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    # Validate project exists
    project = db.query(database.Project).filter(database.Project.id == forecast.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    repo = ForecastRepository(db)
    return repo.create(forecast, created_by="Current User")


@router.put("/{forecast_id}", response_model=schemas.Forecast)
def update_forecast(
    forecast_id: int,
    forecast: schemas.ForecastUpdate,
    db: Session = Depends(get_db)
):
    repo = ForecastRepository(db)
    updated_forecast = repo.update(forecast_id, forecast)
    if not updated_forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    return updated_forecast


@router.delete("/{forecast_id}", status_code=204)
def delete_forecast(forecast_id: int, db: Session = Depends(get_db)):
    repo = ForecastRepository(db)
    if not repo.delete(forecast_id):
        raise HTTPException(status_code=404, detail="Forecast not found")
