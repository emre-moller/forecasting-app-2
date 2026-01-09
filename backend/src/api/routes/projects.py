from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.models import schemas
from src.repositories.forecast_repository import ProjectRepository

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[schemas.Project])
def get_projects(db: Session = Depends(get_db)):
    repo = ProjectRepository(db)
    return repo.get_all()


@router.get("/{project_id}", response_model=schemas.Project)
def get_project(project_id: int, db: Session = Depends(get_db)):
    repo = ProjectRepository(db)
    project = repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
