from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Index
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
    Unified forecast table - stores both LIVE forecasts and SNAPSHOT copies.
    One record per month (12 records per forecast line).
    Grouped by (profitcenter, wbs, account_number, year) to form a forecast line.

    Primary key format:
    - LIVE: {pc}_{wbs}_{acc}_{year}_{month}_LIVE_0
    - SNAP: {pc}_{wbs}_{acc}_{year}_{month}_SNAP_{snapshot_id}
    """
    __tablename__ = "fdwh_forecast"

    # Primary key - composite format: {profitcenter}_{wbs}_{account}_{year}_{month}_{record_type}_{snapshot_id}
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

    # Record type discrimination (LIVE or SNAP)
    record_type = Column(String(10), nullable=False, default='LIVE')  # 'LIVE' or 'SNAP'
    snapshot_id = Column(String(50), nullable=False, default='0')     # '0' for LIVE, UUID for SNAP

    # Snapshot-specific fields (NULL for LIVE records)
    batch_id = Column(String(100), nullable=True, index=True)
    is_approved = Column(Boolean, nullable=False, default=False)
    snapshot_date = Column(DateTime, nullable=True)
    submitted_by = Column(String(100), nullable=True)
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    source_forecast_key = Column(String, nullable=True)  # Links snapshot to original forecast

    __table_args__ = (
        Index('idx_forecast_grouping', 'profitcenter', 'wbs', 'account_number', 'year'),
        Index('idx_forecast_period', 'period'),
        Index('idx_forecast_record_type', 'record_type'),
        Index('idx_forecast_snapshot_id', 'snapshot_id'),
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


# ForecastSnapshotHeader and ForecastSnapshotMonth have been removed.
# Snapshots are now stored in fdwh_forecast table with record_type='SNAP'.
# See FdwhForecast class for the unified storage model.
