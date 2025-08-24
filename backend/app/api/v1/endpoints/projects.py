from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectOut

router = APIRouter()


@router.get("", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()


@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    p = Project(owner_id="seed-owner", name=payload.name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/{id}", response_model=ProjectOut)
def get_project(id: str, db: Session = Depends(get_db)):
    p = db.query(Project).get(id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p
