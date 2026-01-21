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

    # UI metadata fields (stored in separate table, not in Snowflake)
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

    # Audit metadata (from forecast_metadata table)
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
    id: int
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
    """Internal schema for fdwh_forecast table records."""
    pk: str  # Composite: {profitcenter}_{wbs}_{account}_{year}_{month}
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
    model_config = ConfigDict(from_attributes=True)


class ForecastMetadataRecord(BaseModel):
    """Internal schema for forecast_metadata table records."""
    forecast_key: str  # Composite: {profitcenter}_{wbs}_{account}_{year}
    department_id: Optional[int] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[date] = None
    updated_at: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)


class SnapshotHeaderRecord(BaseModel):
    """Internal schema for snapshot header records."""
    forecast_key: str
    profitcenter: Optional[int] = None
    wbs: Optional[str] = None
    account_number: Optional[int] = None
    year: str
    department_id: Optional[int] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    batch_id: str
    is_approved: bool
    snapshot_date: datetime
    submitted_by: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None


class SnapshotMonthRecord(BaseModel):
    """Internal schema for monthly snapshot records."""
    snapshot_header_id: int
    month: str  # "01"-"12"
    amount: Optional[float] = None
    period: Optional[str] = None  # "YYYY-MM"
