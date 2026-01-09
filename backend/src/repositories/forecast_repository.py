from datetime import UTC, datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from src.models import database, schemas


class ForecastRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[database.Forecast]:
        return self.db.query(database.Forecast).all()

    def get_by_id(self, forecast_id: int) -> Optional[database.Forecast]:
        return self.db.query(database.Forecast).filter(database.Forecast.id == forecast_id).first()

    def create(self, forecast: schemas.ForecastCreate, created_by: str) -> database.Forecast:
        db_forecast = database.Forecast(
            **forecast.model_dump(),
            created_by=created_by
        )
        self.db.add(db_forecast)
        self.db.commit()
        self.db.refresh(db_forecast)
        return db_forecast

    def update(self, forecast_id: int, forecast: schemas.ForecastUpdate) -> Optional[database.Forecast]:
        db_forecast = self.get_by_id(forecast_id)
        if db_forecast:
            for key, value in forecast.model_dump().items():
                setattr(db_forecast, key, value)
            self.db.commit()
            self.db.refresh(db_forecast)
        return db_forecast

    def delete(self, forecast_id: int) -> bool:
        db_forecast = self.get_by_id(forecast_id)
        if db_forecast:
            self.db.delete(db_forecast)
            self.db.commit()
            return True
        return False


class ForecastSnapshotRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[database.ForecastSnapshot]:
        return self.db.query(database.ForecastSnapshot).order_by(database.ForecastSnapshot.snapshot_date.desc()).all()

    def get_by_id(self, snapshot_id: int) -> Optional[database.ForecastSnapshot]:
        return self.db.query(database.ForecastSnapshot).filter(database.ForecastSnapshot.id == snapshot_id).first()

    def get_by_forecast_id(self, forecast_id: int) -> List[database.ForecastSnapshot]:
        return self.db.query(database.ForecastSnapshot).filter(
            database.ForecastSnapshot.forecast_id == forecast_id
        ).order_by(database.ForecastSnapshot.snapshot_date.desc()).all()

    def create_from_forecast(self, forecast: database.Forecast, submitted_by: str) -> database.ForecastSnapshot:
        """Create a snapshot from a forecast"""
        snapshot = database.ForecastSnapshot(
            forecast_id=forecast.id,
            department_id=forecast.department_id,
            project_id=forecast.project_id,
            project_name=forecast.project_name,
            profit_center=forecast.profit_center,
            wbs=forecast.wbs,
            account=forecast.account,
            jan=forecast.jan,
            feb=forecast.feb,
            mar=forecast.mar,
            apr=forecast.apr,
            may=forecast.may,
            jun=forecast.jun,
            jul=forecast.jul,
            aug=forecast.aug,
            sep=forecast.sep,
            oct=forecast.oct,
            nov=forecast.nov,
            dec=forecast.dec,
            total=forecast.total,
            yearly_sum=forecast.yearly_sum,
            is_approved=False,
            submitted_by=submitted_by,
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def approve(self, snapshot_id: int, approved_by: str) -> Optional[database.ForecastSnapshot]:
        """Approve a snapshot"""
        snapshot = self.get_by_id(snapshot_id)
        if snapshot:
            snapshot.is_approved = True
            snapshot.approved_by = approved_by
            snapshot.approved_at = datetime.now(UTC)
            self.db.commit()
            self.db.refresh(snapshot)
        return snapshot

    def delete(self, snapshot_id: int) -> bool:
        snapshot = self.get_by_id(snapshot_id)
        if snapshot:
            self.db.delete(snapshot)
            self.db.commit()
            return True
        return False


class DepartmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[database.Department]:
        return self.db.query(database.Department).all()

    def get_by_id(self, department_id: int) -> Optional[database.Department]:
        return self.db.query(database.Department).filter(database.Department.id == department_id).first()


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[database.Project]:
        return self.db.query(database.Project).all()

    def get_by_id(self, project_id: int) -> Optional[database.Project]:
        return self.db.query(database.Project).filter(database.Project.id == project_id).first()
