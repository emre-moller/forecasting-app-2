from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False, unique=True)

    projects = relationship("Project", back_populates="department")
    forecasts = relationship("Forecast", back_populates="department")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(10), nullable=False, unique=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    department = relationship("Department", back_populates="projects")
    forecasts = relationship("Forecast", back_populates="project")


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    # New columns for detailed forecast tracking
    project_name = Column(String(200), nullable=False, default="")
    profit_center = Column(String(100), nullable=False, default="")
    wbs = Column(String(100), nullable=False, default="")
    account = Column(String(100), nullable=False, default="")

    # Monthly forecast values
    jan = Column(Float, nullable=False, default=0.0)
    feb = Column(Float, nullable=False, default=0.0)
    mar = Column(Float, nullable=False, default=0.0)
    apr = Column(Float, nullable=False, default=0.0)
    may = Column(Float, nullable=False, default=0.0)
    jun = Column(Float, nullable=False, default=0.0)
    jul = Column(Float, nullable=False, default=0.0)
    aug = Column(Float, nullable=False, default=0.0)
    sep = Column(Float, nullable=False, default=0.0)
    oct = Column(Float, nullable=False, default=0.0)
    nov = Column(Float, nullable=False, default=0.0)
    dec = Column(Float, nullable=False, default=0.0)

    # Totals
    total = Column(Float, nullable=False, default=0.0)
    yearly_sum = Column(Float, nullable=False, default=0.0)

    # Legacy fields (keeping for backwards compatibility)
    amount = Column(Float, nullable=False, default=0.0)
    time_period = Column(String(50), nullable=False, default="")
    period_type = Column(String(20), nullable=False, default="monthly")
    description = Column(Text, default="")

    created_by = Column(String(100), nullable=False)
    created_at = Column(Date, nullable=False, default=date.today)
    updated_at = Column(Date, nullable=False, default=date.today, onupdate=date.today)

    department = relationship("Department", back_populates="forecasts")
    project = relationship("Project", back_populates="forecasts")
    snapshots = relationship("ForecastSnapshot", back_populates="forecast")


class ForecastSnapshot(Base):
    __tablename__ = "forecast_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    forecast_id = Column(Integer, ForeignKey("forecasts.id"), nullable=False)

    # Snapshot of forecast data at submission time
    department_id = Column(Integer, nullable=False)
    project_id = Column(Integer, nullable=False)
    project_name = Column(String(200), nullable=False)
    profit_center = Column(String(100), nullable=False)
    wbs = Column(String(100), nullable=False)
    account = Column(String(100), nullable=False)

    # Monthly values snapshot
    jan = Column(Float, nullable=False, default=0.0)
    feb = Column(Float, nullable=False, default=0.0)
    mar = Column(Float, nullable=False, default=0.0)
    apr = Column(Float, nullable=False, default=0.0)
    may = Column(Float, nullable=False, default=0.0)
    jun = Column(Float, nullable=False, default=0.0)
    jul = Column(Float, nullable=False, default=0.0)
    aug = Column(Float, nullable=False, default=0.0)
    sep = Column(Float, nullable=False, default=0.0)
    oct = Column(Float, nullable=False, default=0.0)
    nov = Column(Float, nullable=False, default=0.0)
    dec = Column(Float, nullable=False, default=0.0)

    total = Column(Float, nullable=False, default=0.0)
    yearly_sum = Column(Float, nullable=False, default=0.0)

    # Approval status
    is_approved = Column(Boolean, nullable=False, default=False)

    # Metadata
    snapshot_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    submitted_by = Column(String(100), nullable=False)
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    forecast = relationship("Forecast", back_populates="snapshots")
