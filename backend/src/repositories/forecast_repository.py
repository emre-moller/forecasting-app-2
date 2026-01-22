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
    generate_snapshot_id,
    month_int_to_str,
    yearly_forecast_to_monthly_records,
    monthly_records_to_yearly_forecast,
    monthly_records_to_snapshot_view,
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
        Get all LIVE forecasts as yearly views.
        Queries all monthly records with record_type='LIVE', groups by composite key, and transforms to yearly format.
        Metadata is now embedded in the forecast records.
        """
        # Query all LIVE monthly records only
        monthly_records = self.db.query(database.FdwhForecast)\
            .filter(database.FdwhForecast.record_type == 'LIVE')\
            .all()

        if not monthly_records:
            return []

        # Group by composite key (profitcenter, wbs, account_number, year)
        grouped = defaultdict(list)
        for record in monthly_records:
            key = generate_forecast_key(record.profitcenter, record.wbs, record.account_number, record.year)
            grouped[key].append(record)

        # Convert each group to yearly forecast (metadata is embedded in records)
        forecasts = []
        for forecast_key, months in grouped.items():
            if len(months) > 0:
                yearly_dict = monthly_records_to_yearly_forecast(months)
                forecast = schemas.Forecast(**yearly_dict)
                forecasts.append(forecast)

        return forecasts

    def get_by_id(self, forecast_id: str) -> Optional[schemas.Forecast]:
        """
        Get LIVE forecast by composite key.
        Fetches 12 monthly records with record_type='LIVE' and transforms to yearly view.
        Metadata is now embedded in the forecast records.
        """
        # Parse the forecast_id (which is the composite key without month)
        try:
            profitcenter, wbs, account_number, year = parse_forecast_key(forecast_id)
        except ValueError:
            return None

        # Query 12 months for this LIVE forecast
        query = self.db.query(database.FdwhForecast).filter(
            database.FdwhForecast.year == year,
            database.FdwhForecast.record_type == 'LIVE'
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

        # Transform to yearly view (metadata is embedded in records)
        yearly_dict = monthly_records_to_yearly_forecast(months)
        return schemas.Forecast(**yearly_dict)

    def create(self, forecast: schemas.ForecastCreate, created_by: str) -> schemas.Forecast:
        """
        Create a new LIVE forecast from yearly data.
        Transforms yearly data to 12 monthly records and bulk inserts with record_type='LIVE'.
        Metadata is now embedded in each forecast record for Snowflake persistence.
        """
        # Get the year from forecast data (default to "2026")
        year = forecast.year if forecast.year else "2026"

        # Transform yearly data to monthly records (LIVE records with embedded metadata)
        forecast_data = forecast.model_dump()
        ui_metadata = {
            'created_by': created_by,
            'created_at': date.today(),
            'updated_at': date.today(),
        }
        monthly_data = yearly_forecast_to_monthly_records(
            forecast_data, year=year, record_type='LIVE', snapshot_id='0', ui_metadata=ui_metadata
        )

        # Create 12 FdwhForecast database records with embedded metadata
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
                # LIVE record fields
                record_type='LIVE',
                snapshot_id='0',
                batch_id=None,
                is_approved=False,
                snapshot_date=None,
                submitted_by=None,
                approved_by=None,
                approved_at=None,
                source_forecast_key=None,
                # UI metadata fields (embedded for Snowflake persistence)
                department_id=month_data['department_id'],
                project_id=month_data['project_id'],
                project_name=month_data['project_name'],
                created_by=month_data['created_by'],
                created_at=month_data['created_at'],
                updated_at=month_data['updated_at'],
            )
            db_records.append(db_record)

        # Bulk insert forecast records
        self.db.add_all(db_records)
        self.db.commit()

        # Refresh all records
        for record in db_records:
            self.db.refresh(record)

        # Return as yearly view (metadata is embedded in records)
        yearly_dict = monthly_records_to_yearly_forecast(db_records)
        return schemas.Forecast(**yearly_dict)

    def update(self, forecast_id: str, forecast: schemas.ForecastUpdate) -> Optional[schemas.Forecast]:
        """
        Update a LIVE forecast by deleting old monthly records and inserting new ones.
        This is simpler than selective updates and maintains data integrity.
        Only updates LIVE records (record_type='LIVE').
        Metadata is now embedded in each forecast record for Snowflake persistence.
        """
        # Parse the forecast_id
        try:
            old_profitcenter, old_wbs, old_account_number, old_year = parse_forecast_key(forecast_id)
        except ValueError:
            return None

        # Check if LIVE forecast exists
        query = self.db.query(database.FdwhForecast).filter(
            database.FdwhForecast.year == old_year,
            database.FdwhForecast.record_type == 'LIVE'
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

        # Preserve existing metadata from records
        first_existing = existing_months[0]
        created_by = first_existing.created_by or "System"
        created_at = first_existing.created_at or date.today()

        # Delete existing LIVE forecast records
        for record in existing_months:
            self.db.delete(record)

        self.db.flush()

        # Get year from updated forecast (or keep old)
        year = forecast.year if forecast.year else old_year

        # Transform updated data to monthly records (LIVE records with preserved metadata)
        forecast_data = forecast.model_dump()
        ui_metadata = {
            'created_by': created_by,
            'created_at': created_at,
            'updated_at': date.today(),
        }
        monthly_data = yearly_forecast_to_monthly_records(
            forecast_data, year=year, record_type='LIVE', snapshot_id='0', ui_metadata=ui_metadata
        )

        # Insert new records with embedded metadata
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
                # LIVE record fields
                record_type='LIVE',
                snapshot_id='0',
                batch_id=None,
                is_approved=False,
                snapshot_date=None,
                submitted_by=None,
                approved_by=None,
                approved_at=None,
                source_forecast_key=None,
                # UI metadata fields (embedded for Snowflake persistence)
                department_id=month_data['department_id'],
                project_id=month_data['project_id'],
                project_name=month_data['project_name'],
                created_by=month_data['created_by'],
                created_at=month_data['created_at'],
                updated_at=month_data['updated_at'],
            )
            db_records.append(db_record)

        self.db.add_all(db_records)
        self.db.commit()

        # Refresh all records
        for record in db_records:
            self.db.refresh(record)

        # Return as yearly view (metadata is embedded in records)
        yearly_dict = monthly_records_to_yearly_forecast(db_records)
        return schemas.Forecast(**yearly_dict)

    def delete(self, forecast_id: str) -> bool:
        """
        Delete a LIVE forecast by removing all 12 monthly records.
        Only deletes LIVE records (record_type='LIVE').
        Metadata is embedded in records so no separate deletion needed.
        """
        try:
            profitcenter, wbs, account_number, year = parse_forecast_key(forecast_id)
        except ValueError:
            return False

        # Build query for matching LIVE records only
        query = self.db.query(database.FdwhForecast).filter(
            database.FdwhForecast.year == year,
            database.FdwhForecast.record_type == 'LIVE'
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

        # Delete LIVE forecast records (metadata is embedded, deleted with records)
        result = query.delete()

        self.db.commit()
        return result > 0


class ForecastSnapshotRepository:
    """
    Repository for managing forecast snapshots using unified fdwh_forecast table.
    Snapshots are stored as records with record_type='SNAP' and unique snapshot_id.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[schemas.ForecastSnapshot]:
        """
        Get all snapshots as yearly views.
        Queries SNAP records, groups by snapshot_id, and transforms to yearly format.
        Metadata is embedded in the snapshot records.
        """
        # Query all SNAP records
        snap_records = self.db.query(database.FdwhForecast)\
            .filter(database.FdwhForecast.record_type == 'SNAP')\
            .order_by(database.FdwhForecast.snapshot_date.desc())\
            .all()

        if not snap_records:
            return []

        # Group by snapshot_id
        grouped = defaultdict(list)
        for record in snap_records:
            grouped[record.snapshot_id].append(record)

        # Convert each group to yearly snapshot view (metadata is embedded in records)
        snapshots = []
        for snapshot_id, months in grouped.items():
            if len(months) > 0:
                yearly_dict = monthly_records_to_snapshot_view(months)
                snapshot = schemas.ForecastSnapshot(**yearly_dict)
                snapshots.append(snapshot)

        # Sort by snapshot_date descending
        snapshots.sort(key=lambda s: s.snapshot_date, reverse=True)

        return snapshots

    def get_by_id(self, snapshot_id: str) -> Optional[schemas.ForecastSnapshot]:
        """Get snapshot by snapshot_id (string) and return as yearly view.
        Metadata is embedded in the snapshot records."""
        # Query 12 months for this snapshot
        snap_records = self.db.query(database.FdwhForecast)\
            .filter(
                database.FdwhForecast.record_type == 'SNAP',
                database.FdwhForecast.snapshot_id == snapshot_id
            )\
            .order_by(database.FdwhForecast.month)\
            .all()

        if not snap_records:
            return None

        # Metadata is embedded in records
        yearly_dict = monthly_records_to_snapshot_view(snap_records)
        return schemas.ForecastSnapshot(**yearly_dict)

    def get_by_forecast_id(self, forecast_id: str) -> List[schemas.ForecastSnapshot]:
        """Get all snapshots for a specific forecast.
        Metadata is embedded in the snapshot records."""
        # Query SNAP records with matching source_forecast_key
        snap_records = self.db.query(database.FdwhForecast)\
            .filter(
                database.FdwhForecast.record_type == 'SNAP',
                database.FdwhForecast.source_forecast_key == forecast_id
            )\
            .order_by(database.FdwhForecast.snapshot_date.desc())\
            .all()

        if not snap_records:
            return []

        # Group by snapshot_id
        grouped = defaultdict(list)
        for record in snap_records:
            grouped[record.snapshot_id].append(record)

        # Convert each group to yearly snapshot view (metadata is embedded in records)
        snapshots = []
        for snapshot_id, months in grouped.items():
            if len(months) > 0:
                yearly_dict = monthly_records_to_snapshot_view(months)
                snapshot = schemas.ForecastSnapshot(**yearly_dict)
                snapshots.append(snapshot)

        # Sort by snapshot_date descending
        snapshots.sort(key=lambda s: s.snapshot_date, reverse=True)

        return snapshots

    def create_from_forecast(self, forecast_key: str, submitted_by: str, batch_id: str) -> schemas.ForecastSnapshot:
        """
        Create a snapshot from a LIVE forecast identified by forecast_key.
        Copies LIVE records to new SNAP records with unique snapshot_id.
        Metadata is copied from the source LIVE records.
        """
        # Parse forecast key
        try:
            profitcenter, wbs, account_number, year = parse_forecast_key(forecast_key)
        except ValueError:
            raise ValueError(f"Invalid forecast_key: {forecast_key}")

        # Query source LIVE forecast records
        query = self.db.query(database.FdwhForecast).filter(
            database.FdwhForecast.year == year,
            database.FdwhForecast.record_type == 'LIVE'
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

        # Generate unique snapshot_id
        new_snapshot_id = generate_snapshot_id()
        snapshot_date = datetime.now(UTC)

        # Create 12 SNAP records by copying from LIVE records (including embedded metadata)
        snap_records = []
        for source_record in source_months:
            snap_record = database.FdwhForecast(
                pk=generate_pk(
                    source_record.profitcenter,
                    source_record.wbs,
                    source_record.account_number,
                    source_record.year,
                    source_record.month,
                    record_type='SNAP',
                    snapshot_id=new_snapshot_id
                ),
                profitcenter=source_record.profitcenter,
                wbs=source_record.wbs,
                account_number=source_record.account_number,
                year=source_record.year,
                month=source_record.month,
                source=source_record.source,
                load_start_ts=source_record.load_start_ts,
                amount=source_record.amount,
                period=source_record.period,
                dbt_scd_id=source_record.dbt_scd_id,
                dbt_updated_at=source_record.dbt_updated_at,
                dbt_valid_from=source_record.dbt_valid_from,
                dbt_valid_to=source_record.dbt_valid_to,
                # SNAP-specific fields
                record_type='SNAP',
                snapshot_id=new_snapshot_id,
                batch_id=batch_id,
                is_approved=False,
                snapshot_date=snapshot_date,
                submitted_by=submitted_by,
                approved_by=None,
                approved_at=None,
                source_forecast_key=forecast_key,
                # Copy UI metadata from source record
                department_id=source_record.department_id,
                project_id=source_record.project_id,
                project_name=source_record.project_name,
                created_by=source_record.created_by,
                created_at=source_record.created_at,
                updated_at=source_record.updated_at,
            )
            snap_records.append(snap_record)

        self.db.add_all(snap_records)
        self.db.commit()

        # Refresh records
        for record in snap_records:
            self.db.refresh(record)

        # Metadata is embedded in snapshot records
        yearly_dict = monthly_records_to_snapshot_view(snap_records)
        return schemas.ForecastSnapshot(**yearly_dict)

    def create_bulk_snapshots(self, department_id: int, submitted_by: str) -> List[schemas.ForecastSnapshot]:
        """
        Create snapshots for all forecasts in a department.
        All snapshots will share the same batch_id.
        Department is now stored in the forecast records.
        """
        from uuid import uuid4

        # Generate a unique batch ID
        batch_id = f"{department_id}_{int(datetime.now(UTC).timestamp())}_{uuid4().hex[:8]}"

        # Get all unique forecast keys for this department from LIVE forecast records
        # Query distinct forecast groupings by department_id
        live_records = self.db.query(database.FdwhForecast)\
            .filter(
                database.FdwhForecast.record_type == 'LIVE',
                database.FdwhForecast.department_id == department_id
            )\
            .all()

        if not live_records:
            raise ValueError(f"No forecasts found for department_id={department_id}")

        # Get unique forecast keys
        forecast_keys = set()
        for record in live_records:
            key = generate_forecast_key(record.profitcenter, record.wbs, record.account_number, record.year)
            forecast_keys.add(key)

        snapshots = []
        for forecast_key in forecast_keys:
            try:
                snapshot = self.create_from_forecast(
                    forecast_key=forecast_key,
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

    def approve(self, snapshot_id: str, approved_by: str) -> Optional[schemas.ForecastSnapshot]:
        """Approve a snapshot by updating approval fields on all 12 records.
        Metadata is embedded in the snapshot records."""
        # Query all 12 SNAP records for this snapshot
        snap_records = self.db.query(database.FdwhForecast)\
            .filter(
                database.FdwhForecast.record_type == 'SNAP',
                database.FdwhForecast.snapshot_id == snapshot_id
            )\
            .all()

        if not snap_records:
            return None

        # Update all records
        approved_at = datetime.now(UTC)
        for record in snap_records:
            record.is_approved = True
            record.approved_by = approved_by
            record.approved_at = approved_at

        self.db.commit()

        # Refresh records
        for record in snap_records:
            self.db.refresh(record)

        # Metadata is embedded in snapshot records
        yearly_dict = monthly_records_to_snapshot_view(snap_records)
        return schemas.ForecastSnapshot(**yearly_dict)

    def delete(self, snapshot_id: str) -> bool:
        """
        Delete a snapshot by removing all 12 SNAP records.
        """
        # Delete all records with this snapshot_id
        result = self.db.query(database.FdwhForecast)\
            .filter(
                database.FdwhForecast.record_type == 'SNAP',
                database.FdwhForecast.snapshot_id == snapshot_id
            )\
            .delete()

        self.db.commit()
        return result > 0


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
