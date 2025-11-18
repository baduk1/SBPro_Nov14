from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timezone

from app.api.deps import current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.job import Job
from app.models.estimate import Estimate
from app.models.file import File
from app.models.user import User
from app.modules.collaboration.models import ProjectCollaborator
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter()


@router.get("", response_model=List[ProjectOut])
def list_projects(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """List all projects where user is owner or collaborator"""
    import logging
    logger = logging.getLogger(__name__)
    from app.modules.collaboration.models import ProjectCollaborator

    # Get project IDs where user is a collaborator
    collab_project_ids = db.query(ProjectCollaborator.project_id).filter(
        ProjectCollaborator.user_id == user.id
    ).all()
    collab_project_ids = [pid[0] for pid in collab_project_ids]

    # Return all projects where user is owner OR collaborator
    projects = db.query(Project).filter(
        (Project.owner_id == user.id) | (Project.id.in_(collab_project_ids))
    ).all()

    logger.info(f"list_projects for user {user.email} ({user.id}): returning {len(projects)} projects")
    logger.info(f"  - Owned projects: {len([p for p in projects if p.owner_id == user.id])}")
    logger.info(f"  - Collaborated projects: {len(collab_project_ids)}")

    return projects


@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    # Create project with all fields
    p = Project(
        owner_id=user.id,
        name=payload.name,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status or "active"
    )
    db.add(p)
    db.flush()  # Get project ID without committing

    # Automatically add owner as collaborator with 'owner' role
    collab = ProjectCollaborator(
        project_id=p.id,
        user_id=user.id,
        role='owner',
        invited_by=user.id,
        accepted_at=datetime.now(timezone.utc)
    )
    db.add(collab)

    db.commit()
    db.refresh(p)
    return p


@router.get("/{id}", response_model=ProjectOut)
def get_project(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get a specific project - owner or collaborator can access"""
    # First check if project exists
    p = db.query(Project).filter(Project.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if user is owner OR collaborator
    is_owner = p.owner_id == user.id
    is_collaborator = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == id,
        ProjectCollaborator.user_id == user.id
    ).first() is not None

    if not (is_owner or is_collaborator):
        raise HTTPException(status_code=404, detail="Project not found")

    return p


@router.patch("/{id}", response_model=ProjectOut)
def update_project(
    id: str,
    payload: ProjectUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Update project fields - owner or editor can modify"""
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if user is owner OR editor
    is_owner = project.owner_id == user.id
    collaborator = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == id,
        ProjectCollaborator.user_id == user.id
    ).first()
    is_editor = collaborator and collaborator.role == 'editor'

    if not (is_owner or is_editor):
        raise HTTPException(status_code=403, detail="Only project owner or editors can update project")

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


@router.get("/{id}/files")
def get_project_files(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Get all files uploaded for this project - owner or collaborator can access"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"get_project_files called for project_id={id}, user_id={user.id}")

    # Verify project exists
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        logger.warning(f"Project {id} not found")
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info(f"Project found: {project.name}, owner_id={project.owner_id}")

    # Check if user is owner OR collaborator
    is_owner = project.owner_id == user.id
    is_collaborator = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == id,
        ProjectCollaborator.user_id == user.id
    ).first() is not None

    logger.info(f"Access check: is_owner={is_owner}, is_collaborator={is_collaborator}")

    if not (is_owner or is_collaborator):
        logger.warning(f"User {user.id} not authorized for project {id}")
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all files for this project
    files = db.query(File).filter(File.project_id == id).order_by(File.uploaded_at.desc()).all()
    logger.info(f"Found {len(files)} files for project {id}")

    return [{
        "id": f.id,
        "filename": f.filename,
        "type": f.type,
        "size": f.size or 0,
        "created_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
        "project_id": f.project_id,
        "user_id": f.user_id
    } for f in files]


@router.get("/{id}/history", response_model=List[Dict[str, Any]])
def get_project_history(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Get project history timeline (jobs, estimates, files) - owner or collaborator can access"""
    # Verify project exists
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if user is owner OR collaborator
    is_owner = project.owner_id == user.id
    is_collaborator = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == id,
        ProjectCollaborator.user_id == user.id
    ).first() is not None

    if not (is_owner or is_collaborator):
        raise HTTPException(status_code=404, detail="Project not found")
    
    events = []
    
    # Add project creation event
    events.append({
        "id": f"project-{project.id}",
        "type": "created",
        "description": f"Project '{project.name}' created",
        "timestamp": project.created_at.isoformat() if project.created_at else datetime.now(timezone.utc).isoformat(),
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
            "timestamp": f.uploaded_at.isoformat() if f.uploaded_at else datetime.now(timezone.utc).isoformat(),
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
            "timestamp": j.created_at.isoformat() if j.created_at else datetime.now(timezone.utc).isoformat(),
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
            "timestamp": e.created_at.isoformat() if e.created_at else datetime.now(timezone.utc).isoformat(),
            "user_name": user.full_name or user.email,
            "meta": {"estimate_id": e.id, "estimate_name": e.name, "total": e.total}
        })
    
    # Sort by timestamp descending (newest first)
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return events
