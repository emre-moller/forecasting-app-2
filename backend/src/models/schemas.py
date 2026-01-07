from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class DepartmentBase(BaseModel):
    name: str
    code: str


class Department(DepartmentBase):
    id: int

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    name: str
    code: str
    department_id: int


class Project(ProjectBase):
    id: int

    class Config:
        from_attributes = True


class ForecastBase(BaseModel):
    department_id: int
    project_id: int
    amount: float = Field(gt=0)
    time_period: str
    period_type: Literal["monthly", "quarterly", "yearly"]
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

    class Config:
        from_attributes = True
