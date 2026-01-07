from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from models import schemas
from repositories.forecast_repository import DepartmentRepository

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("", response_model=List[schemas.Department])
def get_departments(db: Session = Depends(get_db)):
    repo = DepartmentRepository(db)
    return repo.get_all()
