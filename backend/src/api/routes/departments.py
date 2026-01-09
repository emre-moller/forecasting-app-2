from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.models import schemas
from src.repositories.forecast_repository import DepartmentRepository

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("", response_model=List[schemas.Department])
def get_departments(db: Session = Depends(get_db)):
    repo = DepartmentRepository(db)
    return repo.get_all()


@router.get("/{department_id}", response_model=schemas.Department)
def get_department(department_id: int, db: Session = Depends(get_db)):
    repo = DepartmentRepository(db)
    department = repo.get_by_id(department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department
