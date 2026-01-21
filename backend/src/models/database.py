from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Department(Base):
    """Department lookup table for UI dropdowns."""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False, unique=True)

    projects = relationship("Project", back_populates="department")
    forecast_metadata = relationship("ForecastMetadata", back_populates="department")


class Project(Base):
    """Project lookup table for UI dropdowns."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(10), nullable=False, unique=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    department = relationship("Department", back_populates="projects")
    forecast_metadata = relationship("ForecastMetadata", back_populates="project")


class FdwhForecast(Base):
    """
    Main forecast table - matches Snowflake fdwh_forecast schema exactly.
    One record per month (12 records per forecast line).
    Grouped by (profitcenter, wbs, account_number, year) to form a forecast line.
    """
    __tablename__ = "fdwh_forecast"

    # Primary key - composite format: {profitcenter}_{wbs}_{account}_{year}_{month}
    pk = Column(String, primary_key=True)

    # Core identifying fields
    profitcenter = Column(Integer, nullable=True)
    wbs = Column(String, nullable=True)
    account_number = Column(Integer, nullable=True)
    year = Column(String, nullable=False)  # VARCHAR in Snowflake
    month = Column(String, nullable=False)  # VARCHAR in Snowflake (01-12)

    # Data fields
    source = Column(String(7), nullable=True)  # "MANUAL" or "IMPORT"
    load_start_ts = Column(String, nullable=True)  # Timestamp as string
    amount = Column(Float, nullable=True)

    # DBT SCD (Slowly Changing Dimension) tracking fields
    dbt_scd_id = Column(String(32), nullable=True)
    dbt_updated_at = Column(String, nullable=True)
    dbt_valid_from = Column(String, nullable=True)
    dbt_valid_to = Column(String, nullable=True)

    # Period field (YYYY-MM format)
    period = Column(String, nullable=True)

    __table_args__ = (
        Index('idx_forecast_grouping', 'profitcenter', 'wbs', 'account_number', 'year'),
        Index('idx_forecast_period', 'period'),
    )


class ForecastMetadata(Base):
    """
    Local UI metadata for forecasts - NOT synced to Snowflake.
    Stores department, project, and audit information for display purposes.
    Links to fdwh_forecast by forecast_key (composite key without month).
    """
    __tablename__ = "forecast_metadata"

    # Key format: {profitcenter}_{wbs}_{account}_{year}
    forecast_key = Column(String, primary_key=True)

    # UI reference fields
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    project_name = Column(String(200), nullable=True)

    # Audit fields
    created_by = Column(String(100), nullable=True)
    created_at = Column(Date, nullable=True, default=date.today)
    updated_at = Column(Date, nullable=True, default=date.today, onupdate=date.today)

    # Relationships
    department = relationship("Department", back_populates="forecast_metadata")
    project = relationship("Project", back_populates="forecast_metadata")


class ForecastSnapshotHeader(Base):
    """
    Snapshot header - one record per forecast submission.
    Contains approval metadata and links to monthly snapshot records.
    Adapted for new schema - uses forecast_key instead of line_id.
    """
    __tablename__ = "forecast_snapshot_headers"

    id = Column(Integer, primary_key=True, index=True)

    # Reference to source forecast (composite key without month)
    forecast_key = Column(String, nullable=False, index=True)

    # Snowflake-compatible fields
    profitcenter = Column(Integer, nullable=True)
    wbs = Column(String, nullable=True)
    account_number = Column(Integer, nullable=True)
    year = Column(String, nullable=False)

    # UI metadata (for display)
    department_id = Column(Integer, nullable=True)
    project_id = Column(Integer, nullable=True)
    project_name = Column(String(200), nullable=True)

    # Batch ID to group snapshots submitted together
    batch_id = Column(String(100), nullable=False, index=True)

    # Snapshot metadata
    is_approved = Column(Boolean, nullable=False, default=False)
    snapshot_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    submitted_by = Column(String(100), nullable=False)
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Relationship to monthly records
    monthly_snapshots = relationship("ForecastSnapshotMonth", back_populates="header", cascade="all, delete-orphan")


class ForecastSnapshotMonth(Base):
    """
    Snapshot monthly records - one record per month per snapshot.
    Contains frozen point-in-time data from when forecast was submitted.
    Schema matches fdwh_forecast for consistency.
    """
    __tablename__ = "forecast_snapshot_months"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_header_id = Column(Integer, ForeignKey("forecast_snapshot_headers.id"), nullable=False)

    # Month data (matches fdwh_forecast structure)
    month = Column(String, nullable=False)  # "01"-"12"
    amount = Column(Float, nullable=True)
    period = Column(String, nullable=True)  # "YYYY-MM"

    # Relationship
    header = relationship("ForecastSnapshotHeader", back_populates="monthly_snapshots")

    __table_args__ = (
        UniqueConstraint('snapshot_header_id', 'month', name='uq_snapshot_month'),
    )
