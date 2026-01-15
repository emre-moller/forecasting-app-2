from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False, unique=True)

    projects = relationship("Project", back_populates="department")
    forecast_months = relationship("ForecastMonth", back_populates="department")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(10), nullable=False, unique=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    department = relationship("Department", back_populates="projects")
    forecast_months = relationship("ForecastMonth", back_populates="project")


class ForecastMonth(Base):
    """
    Normalized monthly forecast records - one record per project per month.
    Replaces the denormalized Forecast table with 12 month columns.
    """
    __tablename__ = "forecast_months"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    year = Column(Integer, nullable=False)  # e.g., 2026
    month = Column(Integer, nullable=False)  # 1-12
    amount = Column(Float, nullable=False, default=0.0)

    # Descriptive fields (denormalized from project level for convenience)
    project_name = Column(String(200), nullable=False, default="")
    profit_center = Column(String(100), nullable=False, default="")
    wbs = Column(String(100), nullable=False, default="")
    account = Column(String(100), nullable=False, default="")

    # Metadata
    created_by = Column(String(100), nullable=False)
    created_at = Column(Date, nullable=False, default=date.today)
    updated_at = Column(Date, nullable=False, default=date.today, onupdate=date.today)

    # Relationships
    department = relationship("Department", back_populates="forecast_months")
    project = relationship("Project", back_populates="forecast_months")

    # Composite unique constraint: one record per project per year per month
    __table_args__ = (
        UniqueConstraint('department_id', 'project_id', 'year', 'month', name='uq_forecast_month'),
        Index('idx_forecast_project_year', 'project_id', 'year'),
    )


class ForecastSnapshotHeader(Base):
    """
    Snapshot header - one record per forecast submission.
    Contains approval metadata and links to monthly snapshot records.
    """
    __tablename__ = "forecast_snapshot_headers"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, nullable=False)
    project_id = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

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
    """
    __tablename__ = "forecast_snapshot_months"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_header_id = Column(Integer, ForeignKey("forecast_snapshot_headers.id"), nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    amount = Column(Float, nullable=False, default=0.0)

    # Denormalized descriptive fields (snapshot point-in-time data)
    project_name = Column(String(200), nullable=False, default="")
    profit_center = Column(String(100), nullable=False, default="")
    wbs = Column(String(100), nullable=False, default="")
    account = Column(String(100), nullable=False, default="")

    # Relationship
    header = relationship("ForecastSnapshotHeader", back_populates="monthly_snapshots")

    __table_args__ = (
        UniqueConstraint('snapshot_header_id', 'month', name='uq_snapshot_month'),
    )
