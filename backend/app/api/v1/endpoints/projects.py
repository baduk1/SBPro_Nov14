from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter()


@router.get("", response_model=List[ProjectOut])
def list_projects(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """List all projects owned by the current user"""
    return db.query(Project).filter(Project.owner_id == user.id).all()


@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = Project(owner_id=user.id, name=payload.name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/{id}", response_model=ProjectOut)
def get_project(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get a specific project - ownership verified"""
    p = db.query(Project).filter(Project.id == id, Project.owner_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@router.patch("/{id}", response_model=ProjectOut)
def update_project(
    id: str,
    payload: ProjectUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Update project fields - ownership verified"""
    project = db.query(Project).filter(Project.id == id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update only provided fields
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    if payload.status is not None:
        project.status = payload.status

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{id}")
def delete_project(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Delete project - ownership verified"""
    project = db.query(Project).filter(Project.id == id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully", "id": id}
