from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from app.api.deps import current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.job import Job
from app.models.estimate import Estimate
from app.models.file import File
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


@router.get("/{id}/history", response_model=List[Dict[str, Any]])
def get_project_history(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Get project history timeline (jobs, estimates, files) - ownership verified"""
    # Verify project ownership
    project = db.query(Project).filter(Project.id == id, Project.owner_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    events = []
    
    # Add project creation event
    events.append({
        "id": f"project-{project.id}",
        "type": "created",
        "description": f"Project '{project.name}' created",
        "timestamp": project.created_at.isoformat() if project.created_at else datetime.utcnow().isoformat(),
        "user_name": user.full_name or user.email,
        "meta": {"project_name": project.name}
    })
    
    # Add file upload events
    files = db.query(File).filter(File.project_id == id, File.user_id == user.id).all()
    for f in files:
        events.append({
            "id": f"file-{f.id}",
            "type": "file_uploaded",
            "description": f"File '{f.filename}' uploaded",
            "timestamp": f.uploaded_at.isoformat() if f.uploaded_at else datetime.utcnow().isoformat(),
            "user_name": user.full_name or user.email,
            "meta": {"filename": f.filename, "file_type": f.type}
        })
    
    # Add job events
    jobs = db.query(Job).filter(Job.project_id == id, Job.user_id == user.id).all()
    for j in jobs:
        # Job created event
        events.append({
            "id": f"job-created-{j.id}",
            "type": "job_created",
            "description": f"Takeoff job started (Status: {j.status})",
            "timestamp": j.created_at.isoformat() if j.created_at else datetime.utcnow().isoformat(),
            "user_name": user.full_name or user.email,
            "meta": {"job_id": j.id, "status": j.status}
        })
        
        # Job completed event (if finished)
        if j.status == "completed" and j.finished_at:
            events.append({
                "id": f"job-completed-{j.id}",
                "type": "job_completed",
                "description": "Takeoff job completed successfully",
                "timestamp": j.finished_at.isoformat(),
                "user_name": user.full_name or user.email,
                "meta": {"job_id": j.id}
            })
    
    # Add estimate events
    estimates = db.query(Estimate).filter(
        Estimate.project_id == id,
        Estimate.user_id == user.id
    ).all()
    for e in estimates:
        events.append({
            "id": f"estimate-{e.id}",
            "type": "estimate_created",
            "description": f"Estimate '{e.name}' created (Total: £{e.total:,.2f})",
            "timestamp": e.created_at.isoformat() if e.created_at else datetime.utcnow().isoformat(),
            "user_name": user.full_name or user.email,
            "meta": {"estimate_id": e.id, "estimate_name": e.name, "total": e.total}
        })
    
    # Sort by timestamp descending (newest first)
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return events
