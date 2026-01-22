from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class DepartmentBase(BaseModel):
    name: str
    code: str


class Department(DepartmentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ProjectBase(BaseModel):
    name: str
    code: str
    department_id: int


class Project(ProjectBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ForecastBase(BaseModel):
    """
    External API schema for forecasts - maintains yearly view with 12 month fields.
    Core fields match Snowflake fdwh_forecast schema.
    UI metadata fields are stored separately but included in API for convenience.
    """
    # Snowflake-compatible core fields
    profitcenter: Optional[int] = None
    wbs: Optional[str] = None
    account_number: Optional[int] = None
    year: str = "2026"  # VARCHAR in Snowflake
    source: str = "MANUAL"

    # UI metadata fields (embedded in forecast records for Snowflake persistence)
    department_id: Optional[int] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None

    # Monthly values (yearly API contract)
    jan: float = 0.0
    feb: float = 0.0
    mar: float = 0.0
    apr: float = 0.0
    may: float = 0.0
    jun: float = 0.0
    jul: float = 0.0
    aug: float = 0.0
    sep: float = 0.0
    oct: float = 0.0
    nov: float = 0.0
    dec: float = 0.0

    # Totals (calculated from monthly values)
    total: float = 0.0
    yearly_sum: float = 0.0


class ForecastCreate(ForecastBase):
    pass


class ForecastUpdate(ForecastBase):
    pass


class Forecast(ForecastBase):
    # Composite key: {profitcenter}_{wbs}_{account}_{year}
    id: str

    # DBT/Snowflake metadata (may be null for locally created forecasts)
    dbt_updated_at: Optional[str] = None
    dbt_valid_from: Optional[str] = None
    dbt_valid_to: Optional[str] = None
    period: Optional[str] = None

    # Audit metadata (embedded in forecast records)
    created_by: Optional[str] = None
    created_at: Optional[date] = None
    updated_at: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class ForecastSnapshotBase(BaseModel):
    # Snowflake-compatible core fields
    profitcenter: Optional[int] = None
    wbs: Optional[str] = None
    account_number: Optional[int] = None
    year: str = "2026"

    # UI metadata fields
    department_id: Optional[int] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None

    # Monthly values
    jan: float = 0.0
    feb: float = 0.0
    mar: float = 0.0
    apr: float = 0.0
    may: float = 0.0
    jun: float = 0.0
    jul: float = 0.0
    aug: float = 0.0
    sep: float = 0.0
    oct: float = 0.0
    nov: float = 0.0
    dec: float = 0.0

    total: float = 0.0
    yearly_sum: float = 0.0


class ForecastSnapshotCreate(BaseModel):
    forecast_id: str  # Composite key: {profitcenter}_{wbs}_{account}_{year}
    submitted_by: str = "Current User"


class BulkSnapshotCreate(BaseModel):
    department_id: int
    submitted_by: str = "Current User"


class ForecastSnapshot(ForecastSnapshotBase):
    id: str  # Changed from int to str - now uses snapshot_id (8-char UUID)
    forecast_id: str  # Composite key: {profitcenter}_{wbs}_{account}_{year}
    batch_id: str  # Batch ID to group snapshots submitted together
    is_approved: bool
    snapshot_date: datetime
    submitted_by: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ForecastSnapshotApprove(BaseModel):
    approved_by: str


# Internal database schemas (not exposed via API)
# These schemas map directly to the Snowflake-compatible database tables

class FdwhForecastRecord(BaseModel):
    """Internal schema for fdwh_forecast table records (unified LIVE and SNAP storage with embedded metadata)."""
    pk: str  # Composite: {profitcenter}_{wbs}_{account}_{year}_{month}_{record_type}_{snapshot_id}
    profitcenter: Optional[int] = None
    wbs: Optional[str] = None
    account_number: Optional[int] = None
    year: str
    month: str  # "01"-"12"
    source: Optional[str] = None
    load_start_ts: Optional[str] = None
    amount: Optional[float] = None
    dbt_scd_id: Optional[str] = None
    dbt_updated_at: Optional[str] = None
    dbt_valid_from: Optional[str] = None
    dbt_valid_to: Optional[str] = None
    period: Optional[str] = None  # "YYYY-MM"
    # Record type fields
    record_type: str = 'LIVE'  # 'LIVE' or 'SNAP'
    snapshot_id: str = '0'  # '0' for LIVE, UUID for SNAP
    # Snapshot-specific fields (NULL for LIVE records)
    batch_id: Optional[str] = None
    is_approved: bool = False
    snapshot_date: Optional[datetime] = None
    submitted_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    source_forecast_key: Optional[str] = None
    # UI metadata fields (embedded for Snowflake persistence)
    department_id: Optional[int] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[date] = None
    updated_at: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)


# ForecastMetadataRecord has been removed.
# UI metadata (department_id, project_id, project_name, created_by, etc.)
# is now embedded directly in FdwhForecastRecord for Snowflake persistence.

# SnapshotHeaderRecord and SnapshotMonthRecord have been removed.
# Snapshots are now stored in fdwh_forecast table with record_type='SNAP'.
# See FdwhForecastRecord for the unified schema.
