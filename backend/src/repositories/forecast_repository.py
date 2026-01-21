from datetime import UTC, datetime, date
from typing import List, Optional
from collections import defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import func

from src.models import database, schemas
from src.services.forecast_transformation import (
    generate_forecast_key,
    generate_pk,
    generate_period,
    month_int_to_str,
    yearly_forecast_to_monthly_records,
    extract_metadata_from_yearly,
    monthly_records_to_yearly_forecast,
    snapshot_header_to_yearly_view,
    parse_forecast_key,
)


class ForecastRepository:
    """
    Repository for managing forecasts with Snowflake-compatible fdwh_forecast table.
    Internally stores data as 12 monthly records per forecast line.
    Groups by (profitcenter, wbs, account_number, year) to identify a forecast line.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[schemas.Forecast]:
        """
        Get all forecasts as yearly views.
        Queries all monthly records, groups by composite key, and transforms to yearly format.
        """
        # Query all monthly records
        monthly_records = self.db.query(database.FdwhForecast).all()

        if not monthly_records:
            return []

        # Group by composite key (profitcenter, wbs, account_number, year)
        grouped = defaultdict(list)
        for record in monthly_records:
            key = generate_forecast_key(record.profitcenter, record.wbs, record.account_number, record.year)
            grouped[key].append(record)

        # Get all metadata records for lookup
        metadata_records = self.db.query(database.ForecastMetadata).all()
        metadata_lookup = {m.forecast_key: m for m in metadata_records}

        # Convert each group to yearly forecast
        forecasts = []
        for forecast_key, months in grouped.items():
            if len(months) > 0:
                metadata = metadata_lookup.get(forecast_key)
                yearly_dict = monthly_records_to_yearly_forecast(months, metadata)
                forecast = schemas.Forecast(**yearly_dict)
                forecasts.append(forecast)

        return forecasts

    def get_by_id(self, forecast_id: str) -> Optional[schemas.Forecast]:
        """
        Get forecast by composite key.
        Fetches 12 monthly records and transforms to yearly view.
        """
        # Parse the forecast_id (which is the composite key without month)
        try:
            profitcenter, wbs, account_number, year = parse_forecast_key(forecast_id)
        except ValueError:
            return None

        # Query 12 months for this forecast
        query = self.db.query(database.FdwhForecast).filter(
            database.FdwhForecast.year == year
        )

        if profitcenter is not None:
            query = query.filter(database.FdwhForecast.profitcenter == profitcenter)
        else:
            query = query.filter(database.FdwhForecast.profitcenter.is_(None))

        if wbs is not None:
            query = query.filter(database.FdwhForecast.wbs == wbs)
        else:
            query = query.filter(database.FdwhForecast.wbs.is_(None))

        if account_number is not None:
            query = query.filter(database.FdwhForecast.account_number == account_number)
        else:
            query = query.filter(database.FdwhForecast.account_number.is_(None))

        months = query.order_by(database.FdwhForecast.month).all()

        if len(months) == 0:
            return None

        # Get metadata
        metadata = self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.forecast_key == forecast_id)\
            .first()

        # Transform to yearly view
        yearly_dict = monthly_records_to_yearly_forecast(months, metadata)
        return schemas.Forecast(**yearly_dict)

    def create(self, forecast: schemas.ForecastCreate, created_by: str) -> schemas.Forecast:
        """
        Create a new forecast from yearly data.
        Transforms yearly data to 12 monthly records and bulk inserts.
        Also creates metadata record for UI fields.
        """
        # Get the year from forecast data (default to "2026")
        year = forecast.year if forecast.year else "2026"

        # Transform yearly data to monthly records
        forecast_data = forecast.model_dump()
        monthly_data = yearly_forecast_to_monthly_records(forecast_data, year=year)

        # Create 12 FdwhForecast database records
        db_records = []
        for month_data in monthly_data:
            db_record = database.FdwhForecast(
                pk=month_data['pk'],
                profitcenter=month_data['profitcenter'],
                wbs=month_data['wbs'],
                account_number=month_data['account_number'],
                year=month_data['year'],
                month=month_data['month'],
                source=month_data['source'],
                load_start_ts=month_data['load_start_ts'],
                amount=month_data['amount'],
                period=month_data['period'],
                dbt_scd_id=month_data['dbt_scd_id'],
                dbt_updated_at=month_data['dbt_updated_at'],
                dbt_valid_from=month_data['dbt_valid_from'],
                dbt_valid_to=month_data['dbt_valid_to'],
            )
            db_records.append(db_record)

        # Bulk insert forecast records
        self.db.add_all(db_records)

        # Create metadata record
        metadata_data = extract_metadata_from_yearly(forecast_data, year=year)
        metadata_data['created_by'] = created_by
        db_metadata = database.ForecastMetadata(
            forecast_key=metadata_data['forecast_key'],
            department_id=metadata_data['department_id'],
            project_id=metadata_data['project_id'],
            project_name=metadata_data['project_name'],
            created_by=metadata_data['created_by'],
            created_at=metadata_data['created_at'],
            updated_at=metadata_data['updated_at'],
        )
        self.db.add(db_metadata)

        self.db.commit()

        # Refresh all records
        for record in db_records:
            self.db.refresh(record)
        self.db.refresh(db_metadata)

        # Return as yearly view
        yearly_dict = monthly_records_to_yearly_forecast(db_records, db_metadata)
        return schemas.Forecast(**yearly_dict)

    def update(self, forecast_id: str, forecast: schemas.ForecastUpdate) -> Optional[schemas.Forecast]:
        """
        Update a forecast by deleting old monthly records and inserting new ones.
        This is simpler than selective updates and maintains data integrity.
        """
        # Parse the forecast_id
        try:
            old_profitcenter, old_wbs, old_account_number, old_year = parse_forecast_key(forecast_id)
        except ValueError:
            return None

        # Check if forecast exists
        query = self.db.query(database.FdwhForecast).filter(
            database.FdwhForecast.year == old_year
        )
        if old_profitcenter is not None:
            query = query.filter(database.FdwhForecast.profitcenter == old_profitcenter)
        else:
            query = query.filter(database.FdwhForecast.profitcenter.is_(None))
        if old_wbs is not None:
            query = query.filter(database.FdwhForecast.wbs == old_wbs)
        else:
            query = query.filter(database.FdwhForecast.wbs.is_(None))
        if old_account_number is not None:
            query = query.filter(database.FdwhForecast.account_number == old_account_number)
        else:
            query = query.filter(database.FdwhForecast.account_number.is_(None))

        existing_months = query.all()

        if not existing_months:
            return None

        # Get existing metadata
        existing_metadata = self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.forecast_key == forecast_id)\
            .first()

        created_by = existing_metadata.created_by if existing_metadata else "System"
        created_at = existing_metadata.created_at if existing_metadata else date.today()

        # Delete existing forecast records
        for record in existing_months:
            self.db.delete(record)

        # Delete existing metadata
        if existing_metadata:
            self.db.delete(existing_metadata)

        self.db.flush()

        # Get year from updated forecast (or keep old)
        year = forecast.year if forecast.year else old_year

        # Transform updated data to monthly records
        forecast_data = forecast.model_dump()
        monthly_data = yearly_forecast_to_monthly_records(forecast_data, year=year)

        # Insert new records
        db_records = []
        for month_data in monthly_data:
            db_record = database.FdwhForecast(
                pk=month_data['pk'],
                profitcenter=month_data['profitcenter'],
                wbs=month_data['wbs'],
                account_number=month_data['account_number'],
                year=month_data['year'],
                month=month_data['month'],
                source=month_data['source'],
                load_start_ts=month_data['load_start_ts'],
                amount=month_data['amount'],
                period=month_data['period'],
                dbt_scd_id=month_data['dbt_scd_id'],
                dbt_updated_at=month_data['dbt_updated_at'],
                dbt_valid_from=month_data['dbt_valid_from'],
                dbt_valid_to=month_data['dbt_valid_to'],
            )
            db_records.append(db_record)

        self.db.add_all(db_records)

        # Create new metadata record
        metadata_data = extract_metadata_from_yearly(forecast_data, year=year)
        db_metadata = database.ForecastMetadata(
            forecast_key=metadata_data['forecast_key'],
            department_id=metadata_data['department_id'],
            project_id=metadata_data['project_id'],
            project_name=metadata_data['project_name'],
            created_by=created_by,
            created_at=created_at,
            updated_at=date.today(),
        )
        self.db.add(db_metadata)

        self.db.commit()

        # Refresh all records
        for record in db_records:
            self.db.refresh(record)
        self.db.refresh(db_metadata)

        # Return as yearly view
        yearly_dict = monthly_records_to_yearly_forecast(db_records, db_metadata)
        return schemas.Forecast(**yearly_dict)

    def delete(self, forecast_id: str) -> bool:
        """
        Delete a forecast by removing all 12 monthly records and metadata.
        """
        try:
            profitcenter, wbs, account_number, year = parse_forecast_key(forecast_id)
        except ValueError:
            return False

        # Build query for matching records
        query = self.db.query(database.FdwhForecast).filter(
            database.FdwhForecast.year == year
        )
        if profitcenter is not None:
            query = query.filter(database.FdwhForecast.profitcenter == profitcenter)
        else:
            query = query.filter(database.FdwhForecast.profitcenter.is_(None))
        if wbs is not None:
            query = query.filter(database.FdwhForecast.wbs == wbs)
        else:
            query = query.filter(database.FdwhForecast.wbs.is_(None))
        if account_number is not None:
            query = query.filter(database.FdwhForecast.account_number == account_number)
        else:
            query = query.filter(database.FdwhForecast.account_number.is_(None))

        # Delete forecast records
        result = query.delete()

        # Delete metadata
        self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.forecast_key == forecast_id)\
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
        headers = self.db.query(database.ForecastSnapshotHeader)\
            .order_by(database.ForecastSnapshotHeader.snapshot_date.desc())\
            .all()

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
        headers = self.db.query(database.ForecastSnapshotHeader)\
            .filter_by(forecast_key=forecast_id)\
            .order_by(database.ForecastSnapshotHeader.snapshot_date.desc())\
            .all()

        snapshots = []
        for header in headers:
            yearly_dict = snapshot_header_to_yearly_view(header)
            snapshot = schemas.ForecastSnapshot(**yearly_dict)
            snapshots.append(snapshot)

        return snapshots

    def create_from_forecast(self, forecast_key: str, submitted_by: str, batch_id: str) -> schemas.ForecastSnapshot:
        """
        Create a snapshot from a forecast identified by forecast_key.
        Creates snapshot header + 12 monthly snapshot records.
        """
        # Parse forecast key
        try:
            profitcenter, wbs, account_number, year = parse_forecast_key(forecast_key)
        except ValueError:
            raise ValueError(f"Invalid forecast_key: {forecast_key}")

        # Query source forecast records
        query = self.db.query(database.FdwhForecast).filter(
            database.FdwhForecast.year == year
        )
        if profitcenter is not None:
            query = query.filter(database.FdwhForecast.profitcenter == profitcenter)
        else:
            query = query.filter(database.FdwhForecast.profitcenter.is_(None))
        if wbs is not None:
            query = query.filter(database.FdwhForecast.wbs == wbs)
        else:
            query = query.filter(database.FdwhForecast.wbs.is_(None))
        if account_number is not None:
            query = query.filter(database.FdwhForecast.account_number == account_number)
        else:
            query = query.filter(database.FdwhForecast.account_number.is_(None))

        source_months = query.order_by(database.FdwhForecast.month).all()

        if not source_months:
            raise ValueError(f"Forecast not found for key={forecast_key}")

        # Get metadata for UI fields
        metadata = self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.forecast_key == forecast_key)\
            .first()

        # Create snapshot header
        header = database.ForecastSnapshotHeader(
            forecast_key=forecast_key,
            profitcenter=profitcenter,
            wbs=wbs,
            account_number=account_number,
            year=year,
            department_id=metadata.department_id if metadata else None,
            project_id=metadata.project_id if metadata else None,
            project_name=metadata.project_name if metadata else None,
            batch_id=batch_id,
            submitted_by=submitted_by,
            is_approved=False
        )
        self.db.add(header)
        self.db.flush()

        # Create monthly snapshot records
        for month_record in source_months:
            snapshot_month = database.ForecastSnapshotMonth(
                snapshot_header_id=header.id,
                month=month_record.month,
                amount=month_record.amount,
                period=month_record.period
            )
            self.db.add(snapshot_month)

        self.db.commit()
        self.db.refresh(header)

        yearly_dict = snapshot_header_to_yearly_view(header)
        return schemas.ForecastSnapshot(**yearly_dict)

    def create_bulk_snapshots(self, department_id: int, submitted_by: str) -> List[schemas.ForecastSnapshot]:
        """
        Create snapshots for all forecasts in a department.
        All snapshots will share the same batch_id.
        """
        from uuid import uuid4

        # Generate a unique batch ID
        batch_id = f"{department_id}_{int(datetime.now(UTC).timestamp())}_{uuid4().hex[:8]}"

        # Get all unique forecast keys for this department from metadata
        metadata_records = self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.department_id == department_id)\
            .all()

        if not metadata_records:
            raise ValueError(f"No forecasts found for department_id={department_id}")

        snapshots = []
        for metadata in metadata_records:
            try:
                snapshot = self.create_from_forecast(
                    forecast_key=metadata.forecast_key,
                    submitted_by=submitted_by,
                    batch_id=batch_id
                )
                snapshots.append(snapshot)
            except ValueError:
                # Skip forecasts that don't have data
                continue

        if not snapshots:
            raise ValueError(f"No valid forecasts found for department_id={department_id}")

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
