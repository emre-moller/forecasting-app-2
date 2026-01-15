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
    This schema is used for API requests/responses to maintain backward compatibility.
    """
    department_id: int
    project_id: int

    # Detailed fields
    project_name: str
    profit_center: str
    wbs: str
    account: str

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
    id: str  # Encoded as "project_id_year" (e.g., "1_2026")
    created_by: str
    created_at: date
    updated_at: date
    model_config = ConfigDict(from_attributes=True)


class ForecastSnapshotBase(BaseModel):
    department_id: int
    project_id: int
    project_name: str
    profit_center: str
    wbs: str
    account: str

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
    forecast_id: str  # Encoded as "project_id_year"
    submitted_by: str = "Current User"


class BulkSnapshotCreate(BaseModel):
    department_id: int
    submitted_by: str = "Current User"


class ForecastSnapshot(ForecastSnapshotBase):
    id: int
    forecast_id: str  # Encoded as "project_id_year"
    year: int  # The year of the forecast
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
# These schemas map directly to the normalized database tables

class ForecastMonthBase(BaseModel):
    """Internal schema for monthly forecast records in the database."""
    department_id: int
    project_id: int
    year: int
    month: int  # 1-12
    amount: float
    project_name: str
    profit_center: str
    wbs: str
    account: str


class ForecastMonthDB(ForecastMonthBase):
    """Internal schema with database metadata."""
    id: int
    created_by: str
    created_at: date
    updated_at: date
    model_config = ConfigDict(from_attributes=True)


class SnapshotHeaderBase(BaseModel):
    """Internal schema for snapshot header records."""
    department_id: int
    project_id: int
    year: int
    batch_id: str
    is_approved: bool
    snapshot_date: datetime
    submitted_by: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None


class SnapshotMonthBase(BaseModel):
    """Internal schema for monthly snapshot records."""
    snapshot_header_id: int
    month: int  # 1-12
    amount: float
    project_name: str
    profit_center: str
    wbs: str
    account: str
