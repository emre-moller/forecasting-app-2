from datetime import UTC, datetime
from typing import List, Optional
from collections import defaultdict

from sqlalchemy.orm import Session

from src.models import database, schemas
from src.services.forecast_transformation import (
    encode_forecast_id,
    decode_forecast_id,
    yearly_forecast_to_monthly_records,
    monthly_records_to_yearly_forecast,
    snapshot_header_to_yearly_view,
)


class ForecastRepository:
    """
    Repository for managing forecasts with normalized monthly records.
    Internally stores data as 12 monthly records per forecast, but presents
    a yearly view via the API for backward compatibility.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[schemas.Forecast]:
        """
        Get all forecasts as yearly views.
        Queries all monthly records, groups by (project_id, year), and transforms to yearly format.
        """
        # Query all monthly records
        monthly_records = self.db.query(database.ForecastMonth).all()

        # Group by (project_id, year)
        grouped = defaultdict(list)
        for record in monthly_records:
            key = (record.project_id, record.year)
            grouped[key].append(record)

        # Convert each group to yearly forecast
        forecasts = []
        for (project_id, year), months in grouped.items():
            if len(months) > 0:  # Ensure we have at least one month
                yearly_dict = monthly_records_to_yearly_forecast(months)
                forecast = schemas.Forecast(**yearly_dict)
                forecasts.append(forecast)

        return forecasts

    def get_by_id(self, forecast_id: str) -> Optional[schemas.Forecast]:
        """
        Get forecast by encoded ID (e.g., "1_2026").
        Fetches 12 monthly records and transforms to yearly view.
        """
        try:
            project_id, year = decode_forecast_id(forecast_id)
        except ValueError:
            return None

        # Query 12 months for this project + year
        months = self.db.query(database.ForecastMonth)\
            .filter_by(project_id=project_id, year=year)\
            .order_by(database.ForecastMonth.month)\
            .all()

        if len(months) == 0:
            return None

        # Transform to yearly view
        yearly_dict = monthly_records_to_yearly_forecast(months)
        return schemas.Forecast(**yearly_dict)

    def create(self, forecast: schemas.ForecastCreate, created_by: str) -> schemas.Forecast:
        """
        Create a new forecast from yearly data.
        Transforms yearly data to 12 monthly records and bulk inserts.
        """
        # Determine the year (default to 2026 for now, could be passed in forecast data)
        year = 2026

        # Check if forecast already exists for this project and year
        existing = self.db.query(database.ForecastMonth)\
            .filter_by(project_id=forecast.project_id, year=year)\
            .first()

        if existing:
            raise ValueError(f"Forecast already exists for project_id={forecast.project_id}, year={year}")

        # Transform yearly data to monthly records
        monthly_data = yearly_forecast_to_monthly_records(
            forecast.model_dump(),
            year=year
        )

        # Create 12 ForecastMonth database records
        db_records = []
        for month_data in monthly_data:
            db_record = database.ForecastMonth(
                department_id=month_data['department_id'],
                project_id=month_data['project_id'],
                year=month_data['year'],
                month=month_data['month'],
                amount=month_data['amount'],
                project_name=month_data['project_name'],
                profit_center=month_data['profit_center'],
                wbs=month_data['wbs'],
                account=month_data['account'],
                created_by=created_by
            )
            db_records.append(db_record)

        # Bulk insert
        self.db.add_all(db_records)
        self.db.commit()

        # Refresh all records
        for record in db_records:
            self.db.refresh(record)

        # Return as yearly view
        yearly_dict = monthly_records_to_yearly_forecast(db_records)
        return schemas.Forecast(**yearly_dict)

    def update(self, forecast_id: str, forecast: schemas.ForecastUpdate) -> Optional[schemas.Forecast]:
        """
        Update a forecast by deleting old monthly records and inserting new ones.
        This is simpler than selective updates and maintains data integrity.
        """
        try:
            project_id, year = decode_forecast_id(forecast_id)
        except ValueError:
            return None

        # Check if forecast exists
        existing_months = self.db.query(database.ForecastMonth)\
            .filter_by(project_id=project_id, year=year)\
            .all()

        if not existing_months:
            return None

        # Get created_by from existing record
        created_by = existing_months[0].created_by

        # Delete existing records
        self.db.query(database.ForecastMonth)\
            .filter_by(project_id=project_id, year=year)\
            .delete()

        # Transform updated data to monthly records
        monthly_data = yearly_forecast_to_monthly_records(
            forecast.model_dump(),
            year=year
        )

        # Insert new records
        db_records = []
        for month_data in monthly_data:
            db_record = database.ForecastMonth(
                department_id=month_data['department_id'],
                project_id=month_data['project_id'],
                year=month_data['year'],
                month=month_data['month'],
                amount=month_data['amount'],
                project_name=month_data['project_name'],
                profit_center=month_data['profit_center'],
                wbs=month_data['wbs'],
                account=month_data['account'],
                created_by=created_by
            )
            db_records.append(db_record)

        self.db.add_all(db_records)
        self.db.commit()

        # Refresh all records
        for record in db_records:
            self.db.refresh(record)

        # Return as yearly view
        yearly_dict = monthly_records_to_yearly_forecast(db_records)
        return schemas.Forecast(**yearly_dict)

    def delete(self, forecast_id: str) -> bool:
        """
        Delete a forecast by removing all 12 monthly records.
        """
        try:
            project_id, year = decode_forecast_id(forecast_id)
        except ValueError:
            return False

        # Delete all monthly records for this forecast
        result = self.db.query(database.ForecastMonth)\
            .filter_by(project_id=project_id, year=year)\
            .delete()

        self.db.commit()
        return result > 0


class ForecastSnapshotRepository:
    """
    Repository for managing forecast snapshots with normalized monthly records.
    Creates a snapshot header with 12 monthly snapshot records.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[schemas.ForecastSnapshot]:
        """
        Get all snapshots as yearly views.
        Queries headers with monthly records and transforms to yearly format.
        """
        # Query all snapshot headers with eager loading of monthly records
        headers = self.db.query(database.ForecastSnapshotHeader)\
            .order_by(database.ForecastSnapshotHeader.snapshot_date.desc())\
            .all()

        # Convert each header to yearly view
        snapshots = []
        for header in headers:
            yearly_dict = snapshot_header_to_yearly_view(header)
            snapshot = schemas.ForecastSnapshot(**yearly_dict)
            snapshots.append(snapshot)

        return snapshots

    def get_by_id(self, snapshot_id: int) -> Optional[schemas.ForecastSnapshot]:
        """Get snapshot by ID and return as yearly view."""
        header = self.db.query(database.ForecastSnapshotHeader)\
            .filter(database.ForecastSnapshotHeader.id == snapshot_id)\
            .first()

        if not header:
            return None

        yearly_dict = snapshot_header_to_yearly_view(header)
        return schemas.ForecastSnapshot(**yearly_dict)

    def get_by_forecast_id(self, forecast_id: str) -> List[schemas.ForecastSnapshot]:
        """Get all snapshots for a specific forecast."""
        try:
            project_id, year = decode_forecast_id(forecast_id)
        except ValueError:
            return []

        headers = self.db.query(database.ForecastSnapshotHeader)\
            .filter_by(project_id=project_id, year=year)\
            .order_by(database.ForecastSnapshotHeader.snapshot_date.desc())\
            .all()

        snapshots = []
        for header in headers:
            yearly_dict = snapshot_header_to_yearly_view(header)
            snapshot = schemas.ForecastSnapshot(**yearly_dict)
            snapshots.append(snapshot)

        return snapshots

    def create_from_forecast(self, project_id: int, year: int, submitted_by: str, batch_id: str) -> schemas.ForecastSnapshot:
        """
        Create a snapshot from a forecast identified by project_id and year.
        Creates snapshot header + 12 monthly snapshot records.
        """
        # Get source forecast monthly records
        source_months = self.db.query(database.ForecastMonth)\
            .filter_by(project_id=project_id, year=year)\
            .order_by(database.ForecastMonth.month)\
            .all()

        if not source_months:
            raise ValueError(f"Forecast not found for project_id={project_id}, year={year}")

        # Create snapshot header
        header = database.ForecastSnapshotHeader(
            department_id=source_months[0].department_id,
            project_id=project_id,
            year=year,
            batch_id=batch_id,
            submitted_by=submitted_by,
            is_approved=False
        )
        self.db.add(header)
        self.db.flush()  # Get header.id before creating monthly records

        # Create monthly snapshot records
        for month_record in source_months:
            snapshot_month = database.ForecastSnapshotMonth(
                snapshot_header_id=header.id,
                month=month_record.month,
                amount=month_record.amount,
                project_name=month_record.project_name,
                profit_center=month_record.profit_center,
                wbs=month_record.wbs,
                account=month_record.account
            )
            self.db.add(snapshot_month)

        self.db.commit()
        self.db.refresh(header)

        # Return as yearly view
        yearly_dict = snapshot_header_to_yearly_view(header)
        return schemas.ForecastSnapshot(**yearly_dict)

    def create_bulk_snapshots(self, department_id: int, submitted_by: str) -> List[schemas.ForecastSnapshot]:
        """
        Create snapshots for all forecasts in a department.
        All snapshots will share the same batch_id (generated from timestamp).
        Returns list of created snapshots.
        """
        from uuid import uuid4

        # Generate a unique batch ID
        batch_id = f"{department_id}_{int(datetime.now(UTC).timestamp())}_{uuid4().hex[:8]}"

        # Get all unique (project_id, year) combinations for this department
        unique_forecasts = self.db.query(
            database.ForecastMonth.project_id,
            database.ForecastMonth.year
        ).filter(
            database.ForecastMonth.department_id == department_id
        ).distinct().all()

        if not unique_forecasts:
            raise ValueError(f"No forecasts found for department_id={department_id}")

        snapshots = []
        for project_id, year in unique_forecasts:
            snapshot = self.create_from_forecast(
                project_id=project_id,
                year=year,
                submitted_by=submitted_by,
                batch_id=batch_id
            )
            snapshots.append(snapshot)

        return snapshots

    def approve(self, snapshot_id: int, approved_by: str) -> Optional[schemas.ForecastSnapshot]:
        """Approve a snapshot by updating approval fields."""
        header = self.db.query(database.ForecastSnapshotHeader)\
            .filter(database.ForecastSnapshotHeader.id == snapshot_id)\
            .first()

        if not header:
            return None

        header.is_approved = True
        header.approved_by = approved_by
        header.approved_at = datetime.now(UTC)

        self.db.commit()
        self.db.refresh(header)

        yearly_dict = snapshot_header_to_yearly_view(header)
        return schemas.ForecastSnapshot(**yearly_dict)

    def delete(self, snapshot_id: int) -> bool:
        """
        Delete a snapshot.
        Deletes header which cascades to monthly records.
        """
        header = self.db.query(database.ForecastSnapshotHeader)\
            .filter(database.ForecastSnapshotHeader.id == snapshot_id)\
            .first()

        if not header:
            return False

        self.db.delete(header)
        self.db.commit()
        return True


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
