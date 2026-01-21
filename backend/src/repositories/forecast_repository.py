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
    extract_metadata_from_yearly,
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
        Get LIVE forecast by composite key.
        Fetches 12 monthly records with record_type='LIVE' and transforms to yearly view.
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

        # Get metadata
        metadata = self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.forecast_key == forecast_id)\
            .first()

        # Transform to yearly view
        yearly_dict = monthly_records_to_yearly_forecast(months, metadata)
        return schemas.Forecast(**yearly_dict)

    def create(self, forecast: schemas.ForecastCreate, created_by: str) -> schemas.Forecast:
        """
        Create a new LIVE forecast from yearly data.
        Transforms yearly data to 12 monthly records and bulk inserts with record_type='LIVE'.
        Also creates metadata record for UI fields.
        """
        # Get the year from forecast data (default to "2026")
        year = forecast.year if forecast.year else "2026"

        # Transform yearly data to monthly records (LIVE records)
        forecast_data = forecast.model_dump()
        monthly_data = yearly_forecast_to_monthly_records(
            forecast_data, year=year, record_type='LIVE', snapshot_id='0'
        )

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
        Update a LIVE forecast by deleting old monthly records and inserting new ones.
        This is simpler than selective updates and maintains data integrity.
        Only updates LIVE records (record_type='LIVE').
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

        # Get existing metadata
        existing_metadata = self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.forecast_key == forecast_id)\
            .first()

        created_by = existing_metadata.created_by if existing_metadata else "System"
        created_at = existing_metadata.created_at if existing_metadata else date.today()

        # Delete existing LIVE forecast records
        for record in existing_months:
            self.db.delete(record)

        # Delete existing metadata
        if existing_metadata:
            self.db.delete(existing_metadata)

        self.db.flush()

        # Get year from updated forecast (or keep old)
        year = forecast.year if forecast.year else old_year

        # Transform updated data to monthly records (LIVE records)
        forecast_data = forecast.model_dump()
        monthly_data = yearly_forecast_to_monthly_records(
            forecast_data, year=year, record_type='LIVE', snapshot_id='0'
        )

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
        Delete a LIVE forecast by removing all 12 monthly records and metadata.
        Only deletes LIVE records (record_type='LIVE').
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

        # Delete LIVE forecast records
        result = query.delete()

        # Delete metadata
        self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.forecast_key == forecast_id)\
            .delete()

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

        # Get all metadata records for lookup
        metadata_records = self.db.query(database.ForecastMetadata).all()
        metadata_lookup = {m.forecast_key: m for m in metadata_records}

        # Convert each group to yearly snapshot view
        snapshots = []
        for snapshot_id, months in grouped.items():
            if len(months) > 0:
                # Get metadata using source_forecast_key
                source_key = months[0].source_forecast_key
                metadata = metadata_lookup.get(source_key) if source_key else None
                yearly_dict = monthly_records_to_snapshot_view(months, metadata)
                snapshot = schemas.ForecastSnapshot(**yearly_dict)
                snapshots.append(snapshot)

        # Sort by snapshot_date descending
        snapshots.sort(key=lambda s: s.snapshot_date, reverse=True)

        return snapshots

    def get_by_id(self, snapshot_id: str) -> Optional[schemas.ForecastSnapshot]:
        """Get snapshot by snapshot_id (string) and return as yearly view."""
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

        # Get metadata using source_forecast_key
        source_key = snap_records[0].source_forecast_key
        metadata = None
        if source_key:
            metadata = self.db.query(database.ForecastMetadata)\
                .filter(database.ForecastMetadata.forecast_key == source_key)\
                .first()

        yearly_dict = monthly_records_to_snapshot_view(snap_records, metadata)
        return schemas.ForecastSnapshot(**yearly_dict)

    def get_by_forecast_id(self, forecast_id: str) -> List[schemas.ForecastSnapshot]:
        """Get all snapshots for a specific forecast."""
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

        # Get metadata
        metadata = self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.forecast_key == forecast_id)\
            .first()

        # Convert each group to yearly snapshot view
        snapshots = []
        for snapshot_id, months in grouped.items():
            if len(months) > 0:
                yearly_dict = monthly_records_to_snapshot_view(months, metadata)
                snapshot = schemas.ForecastSnapshot(**yearly_dict)
                snapshots.append(snapshot)

        # Sort by snapshot_date descending
        snapshots.sort(key=lambda s: s.snapshot_date, reverse=True)

        return snapshots

    def create_from_forecast(self, forecast_key: str, submitted_by: str, batch_id: str) -> schemas.ForecastSnapshot:
        """
        Create a snapshot from a LIVE forecast identified by forecast_key.
        Copies LIVE records to new SNAP records with unique snapshot_id.
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

        # Get metadata for UI fields
        metadata = self.db.query(database.ForecastMetadata)\
            .filter(database.ForecastMetadata.forecast_key == forecast_key)\
            .first()

        # Generate unique snapshot_id
        new_snapshot_id = generate_snapshot_id()
        snapshot_date = datetime.now(UTC)

        # Create 12 SNAP records by copying from LIVE records
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
            )
            snap_records.append(snap_record)

        self.db.add_all(snap_records)
        self.db.commit()

        # Refresh records
        for record in snap_records:
            self.db.refresh(record)

        yearly_dict = monthly_records_to_snapshot_view(snap_records, metadata)
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

    def approve(self, snapshot_id: str, approved_by: str) -> Optional[schemas.ForecastSnapshot]:
        """Approve a snapshot by updating approval fields on all 12 records."""
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

        # Get metadata using source_forecast_key
        source_key = snap_records[0].source_forecast_key
        metadata = None
        if source_key:
            metadata = self.db.query(database.ForecastMetadata)\
                .filter(database.ForecastMetadata.forecast_key == source_key)\
                .first()

        yearly_dict = monthly_records_to_snapshot_view(snap_records, metadata)
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
