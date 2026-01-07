from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from models import schemas
from repositories.forecast_repository import ProjectRepository

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[schemas.Project])
def get_projects(db: Session = Depends(get_db)):
    repo = ProjectRepository(db)
    return repo.get_all()
