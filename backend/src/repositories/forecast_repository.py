from typing import List, Optional

from sqlalchemy.orm import Session

from models import database, schemas


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
