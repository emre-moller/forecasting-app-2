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
    department_id: int
    project_id: int

    # New detailed fields
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

    # Totals
    total: float = 0.0
    yearly_sum: float = 0.0

    # Legacy fields (keeping for backwards compatibility)
    amount: float = 0.0
    time_period: str = ""
    period_type: Literal["monthly", "quarterly", "yearly"] = "monthly"
    description: str = ""


class ForecastCreate(ForecastBase):
    pass


class ForecastUpdate(ForecastBase):
    pass


class Forecast(ForecastBase):
    id: int
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
    forecast_id: int
    submitted_by: str = "Current User"


class ForecastSnapshot(ForecastSnapshotBase):
    id: int
    forecast_id: int
    is_approved: bool
    snapshot_date: datetime
    submitted_by: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ForecastSnapshotApprove(BaseModel):
    approved_by: str
