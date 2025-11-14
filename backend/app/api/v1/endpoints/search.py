"""
Global Search API Endpoint

Provides Spotlight-like search across all entities:
- Projects
- Tasks
- BoQ Items
- Team Members
- Files
- Estimates
- Templates
- Suppliers
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Dict, Any

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.boq_item import BoqItem
from app.models.file import File
from app.models.estimate import Estimate
from app.models.template import Template
from app.models.supplier import Supplier
from app.modules.tasks.models import Task
from app.modules.collaboration.models import ProjectCollaborator

router = APIRouter()


@router.get("/search")
def global_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(50, ge=1, le=100, description="Max results per category"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Global search across all entities accessible to the user.

    Returns categorized results with:
    - type: entity type (project, task, boq, team, file, estimate, template, supplier)
    - title: primary display text
    - subtitle: secondary display text
    - url: frontend navigation URL
    - metadata: additional info (e.g., date, count)
    """
    results: List[Dict[str, Any]] = []
    search_term = f"%{q.lower()}%"

    # 1. Search Projects (owned or collaborated)
    user_project_ids = (
        db.query(ProjectCollaborator.project_id)
        .filter(ProjectCollaborator.user_id == user.id)
        .all()
    )
    user_project_ids = [pid[0] for pid in user_project_ids]

    projects = (
        db.query(Project)
        .filter(
            and_(
                or_(
                    Project.owner_id == user.id,
                    Project.id.in_(user_project_ids)
                ),
                or_(
                    func.lower(Project.name).like(search_term),
                    func.lower(Project.description).like(search_term)
                )
            )
        )
        .limit(limit)
        .all()
    )

    for project in projects:
        results.append({
            "id": project.id,
            "type": "project",
            "title": project.name,
            "subtitle": project.description[:100] if project.description else None,
            "url": f"/app/projects/{project.id}/overview",
            "metadata": f"Status: {project.status}" if project.status else None,
        })

    # 2. Search Tasks (in user's projects)
    if user_project_ids:
        tasks = (
            db.query(Task)
            .filter(
                and_(
                    Task.project_id.in_(user_project_ids),
                    or_(
                        func.lower(Task.title).like(search_term),
                        func.lower(Task.description).like(search_term)
                    )
                )
            )
            .limit(limit)
            .all()
        )

        for task in tasks:
            project = db.query(Project).filter(Project.id == task.project_id).first()
            results.append({
                "id": str(task.id),
                "type": "task",
                "title": task.title,
                "subtitle": f"Project: {project.name if project else 'Unknown'}",
                "url": f"/app/projects/{task.project_id}/tasks",
                "metadata": f"Status: {task.status}" if task.status else None,
            })

    # 3. Search BoQ Items (in user's projects)
    if user_project_ids:
        boq_items = (
            db.query(BoqItem)
            .filter(
                and_(
                    BoqItem.project_id.in_(user_project_ids),
                    func.lower(BoqItem.material_name).like(search_term)
                )
            )
            .limit(limit)
            .all()
        )

        for item in boq_items:
            project = db.query(Project).filter(Project.id == item.project_id).first()
            results.append({
                "id": item.id,
                "type": "boq",
                "title": item.material_name,
                "subtitle": f"Project: {project.name if project else 'Unknown'}",
                "url": f"/app/projects/{item.project_id}/boq",
                "metadata": f"{item.quantity} {item.unit}" if item.quantity and item.unit else None,
            })

    # 4. Search Team Members (collaborators in user's projects)
    if user_project_ids:
        collaborators = (
            db.query(ProjectCollaborator)
            .join(User, ProjectCollaborator.user_id == User.id)
            .filter(
                and_(
                    ProjectCollaborator.project_id.in_(user_project_ids),
                    or_(
                        func.lower(User.name).like(search_term),
                        func.lower(User.email).like(search_term)
                    )
                )
            )
            .limit(limit)
            .all()
        )

        for collab in collaborators:
            collab_user = db.query(User).filter(User.id == collab.user_id).first()
            project = db.query(Project).filter(Project.id == collab.project_id).first()
            if collab_user:
                results.append({
                    "id": str(collab.id),
                    "type": "team",
                    "title": collab_user.name or collab_user.email,
                    "subtitle": f"Project: {project.name if project else 'Unknown'}",
                    "url": f"/app/projects/{collab.project_id}/team",
                    "metadata": f"Role: {collab.role}" if collab.role else None,
                })

    # 5. Search Files (in user's projects)
    if user_project_ids:
        files = (
            db.query(File)
            .filter(
                and_(
                    File.project_id.in_(user_project_ids),
                    func.lower(File.filename).like(search_term)
                )
            )
            .limit(limit)
            .all()
        )

        for file in files:
            project = db.query(Project).filter(Project.id == file.project_id).first()
            results.append({
                "id": file.id,
                "type": "file",
                "title": file.filename,
                "subtitle": f"Project: {project.name if project else 'Unknown'}",
                "url": f"/app/projects/{file.project_id}/files",
                "metadata": file.file_type if file.file_type else None,
            })

    # 6. Search Estimates (owned by user)
    estimates = (
        db.query(Estimate)
        .filter(
            and_(
                Estimate.owner_id == user.id,
                or_(
                    func.lower(Estimate.name).like(search_term),
                    func.lower(Estimate.description).like(search_term)
                )
            )
        )
        .limit(limit)
        .all()
    )

    for estimate in estimates:
        results.append({
            "id": estimate.id,
            "type": "estimate",
            "title": estimate.name,
            "subtitle": estimate.description[:100] if estimate.description else None,
            "url": f"/app/estimates/{estimate.id}",
            "metadata": f"Version: {estimate.version}" if estimate.version else None,
        })

    # 7. Search Templates (public or owned by user)
    templates = (
        db.query(Template)
        .filter(
            and_(
                or_(
                    Template.is_public == True,
                    Template.owner_id == user.id
                ),
                or_(
                    func.lower(Template.name).like(search_term),
                    func.lower(Template.description).like(search_term)
                )
            )
        )
        .limit(limit)
        .all()
    )

    for template in templates:
        results.append({
            "id": template.id,
            "type": "template",
            "title": template.name,
            "subtitle": template.description[:100] if template.description else None,
            "url": f"/app/templates/{template.id}",
            "metadata": "Public" if template.is_public else "Private",
        })

    # 8. Search Suppliers (owned by user)
    suppliers = (
        db.query(Supplier)
        .filter(
            and_(
                Supplier.owner_id == user.id,
                or_(
                    func.lower(Supplier.name).like(search_term),
                    func.lower(Supplier.contact_person).like(search_term)
                )
            )
        )
        .limit(limit)
        .all()
    )

    for supplier in suppliers:
        results.append({
            "id": supplier.id,
            "type": "supplier",
            "title": supplier.name,
            "subtitle": f"Contact: {supplier.contact_person}" if supplier.contact_person else None,
            "url": f"/app/suppliers/{supplier.id}",
            "metadata": supplier.email if supplier.email else None,
        })

    return {
        "query": q,
        "results": results,
        "count": len(results),
    }
