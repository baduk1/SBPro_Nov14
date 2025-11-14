"""
Tasks/PM Module - API Router

Pluggable FastAPI router for task management features.
Can be mounted in any FastAPI application.
"""
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User

from app.modules.tasks.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskFilter,
    TaskBulkStatusUpdate,
    TaskBulkAssignUpdate,
    TaskReorderRequest,
    TaskMoveRequest,
    TaskRevisionResponse,
    ProjectKPIs
)
from app.modules.tasks.service import TasksService
from app.modules.tasks.config import TasksModuleConfig, SKYBUILD_TASKS_CONFIG
from app.modules.collaboration.permissions import permission_checker


def create_tasks_router(
    config: TasksModuleConfig = SKYBUILD_TASKS_CONFIG
) -> APIRouter:
    """
    Factory function to create a tasks router with custom configuration.

    This makes the router reusable across different projects.
    """
    router = APIRouter(tags=["tasks", "project-management"])
    service = TasksService(config)

    # ==================== Task CRUD ====================

    @router.get("/projects/{project_id}/tasks", response_model=dict)
    def list_tasks(
        project_id: str,
        status: Optional[str] = Query(None),
        priority: Optional[str] = Query(None),
        assignee_id: Optional[str] = Query(None),
        type: Optional[str] = Query(None),
        search: Optional[str] = Query(None),
        overdue: Optional[bool] = Query(None),
        unassigned: Optional[bool] = Query(None),
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        sort_by: str = Query("created_at"),
        sort_order: str = Query("desc", regex="^(asc|desc)$"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        List tasks for a project with filtering and pagination.

        Requires: viewer role or higher
        """
        # Check permissions
        project, user_role = permission_checker.require_project_access(
            project_id, "viewer", db, current_user
        )

        # Build filters
        filters = TaskFilter(
            status=status,
            priority=priority,
            assignee_id=assignee_id,
            type=type,
            search=search,
            overdue=overdue,
            unassigned=unassigned,
            page=page,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )

        # Get tasks
        tasks, total_count = service.get_tasks(db, project_id, filters)

        # Enrich with user details
        result = []
        for task in tasks:
            # Get assignee details
            assignee = None
            if task.assignee_id:
                assignee_user = db.query(User).filter(User.id == task.assignee_id).first()
                if assignee_user:
                    assignee = {
                        "id": assignee_user.id,
                        "email": assignee_user.email,
                        "full_name": assignee_user.full_name
                    }

            # Get creator details
            creator = None
            creator_user = db.query(User).filter(User.id == task.created_by).first()
            if creator_user:
                creator = {
                    "id": creator_user.id,
                    "email": creator_user.email,
                    "full_name": creator_user.full_name
                }

            result.append({
                "id": task.id,
                "project_id": task.project_id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "due_date": task.due_date,
                "start_date": task.start_date,
                "type": task.type,
                "labels": task.labels or [],
                "linked_resource_type": task.linked_resource_type,
                "linked_resource_id": task.linked_resource_id,
                "boq_item_id": task.boq_item_id,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "assignee": assignee,
                "created_by_user": creator
            })

        return {
            "tasks": result,
            "total": total_count,
            "page": page,
            "limit": limit,
            "pages": (total_count + limit - 1) // limit
        }

    @router.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
    def create_task(
        project_id: str,
        data: TaskCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Create a new task.

        Requires: editor role or higher
        """
        # Check permissions
        project, user_role = permission_checker.require_project_access(
            project_id, "editor", db, current_user
        )

        try:
            task = service.create_task(db, project_id, data, current_user.id)

            # Get user details for response
            assignee = None
            if task.assignee_id:
                assignee_user = db.query(User).filter(User.id == task.assignee_id).first()
                if assignee_user:
                    assignee = {
                        "id": assignee_user.id,
                        "email": assignee_user.email,
                        "full_name": assignee_user.full_name
                    }

            creator = db.query(User).filter(User.id == task.created_by).first()

            # Log activity (using collaboration module)
            from app.modules.collaboration.service import collaboration_service
            collaboration_service.log_activity(
                db, project_id, current_user.id, "task.created",
                {"task_id": task.id, "title": task.title}
            )

            return {
                "id": task.id,
                "project_id": task.project_id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "due_date": task.due_date,
                "start_date": task.start_date,
                "type": task.type,
                "labels": task.labels or [],
                "linked_resource_type": task.linked_resource_type,
                "linked_resource_id": task.linked_resource_id,
                "boq_item_id": task.boq_item_id,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "assignee": assignee,
                "created_by_user": {
                    "id": creator.id,
                    "email": creator.email,
                    "full_name": creator.full_name
                } if creator else None
            }

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @router.get("/tasks/{task_id}", response_model=TaskResponse)
    def get_task(
        task_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Get a single task by ID.

        Requires: viewer role on the task's project
        """
        task = service.get_task(db, task_id)

        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        # Check permissions on the project
        project, user_role = permission_checker.require_project_access(
            task.project_id, "viewer", db, current_user
        )

        # Enrich with user details
        assignee = None
        if task.assignee_id:
            assignee_user = db.query(User).filter(User.id == task.assignee_id).first()
            if assignee_user:
                assignee = {
                    "id": assignee_user.id,
                    "email": assignee_user.email,
                    "full_name": assignee_user.full_name
                }

        creator = db.query(User).filter(User.id == task.created_by).first()

        return {
            "id": task.id,
            "project_id": task.project_id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "due_date": task.due_date,
            "start_date": task.start_date,
            "type": task.type,
            "labels": task.labels or [],
            "linked_resource_type": task.linked_resource_type,
            "linked_resource_id": task.linked_resource_id,
            "boq_item_id": task.boq_item_id,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "assignee": assignee,
            "created_by_user": {
                "id": creator.id,
                "email": creator.email,
                "full_name": creator.full_name
            } if creator else None
        }

    @router.patch("/tasks/{task_id}", response_model=TaskResponse)
    def update_task(
        task_id: int,
        data: TaskUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Update a task.

        Requires: editor role or higher
        """
        # Get task to check project
        existing_task = service.get_task(db, task_id)

        if not existing_task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        # Check permissions
        project, user_role = permission_checker.require_project_access(
            existing_task.project_id, "editor", db, current_user
        )

        try:
            task = service.update_task(db, task_id, data, current_user.id)

            # Get user details for response
            assignee = None
            if task.assignee_id:
                assignee_user = db.query(User).filter(User.id == task.assignee_id).first()
                if assignee_user:
                    assignee = {
                        "id": assignee_user.id,
                        "email": assignee_user.email,
                        "full_name": assignee_user.full_name
                    }

            creator = db.query(User).filter(User.id == task.created_by).first()

            # Log activity
            from app.modules.collaboration.service import collaboration_service
            collaboration_service.log_activity(
                db, task.project_id, current_user.id, "task.updated",
                {"task_id": task.id, "title": task.title}
            )

            return {
                "id": task.id,
                "project_id": task.project_id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "due_date": task.due_date,
                "start_date": task.start_date,
                "type": task.type,
                "labels": task.labels or [],
                "linked_resource_type": task.linked_resource_type,
                "linked_resource_id": task.linked_resource_id,
                "boq_item_id": task.boq_item_id,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "assignee": assignee,
                "created_by_user": {
                    "id": creator.id,
                    "email": creator.email,
                    "full_name": creator.full_name
                } if creator else None
            }

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_task(
        task_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Delete a task.

        Requires: editor role or higher
        """
        # Get task to check project
        existing_task = service.get_task(db, task_id)

        if not existing_task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        # Check permissions
        project, user_role = permission_checker.require_project_access(
            existing_task.project_id, "editor", db, current_user
        )

        success = service.delete_task(db, task_id)

        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        # Log activity
        from app.modules.collaboration.service import collaboration_service
        collaboration_service.log_activity(
            db, existing_task.project_id, current_user.id, "task.deleted",
            {"task_id": task_id, "title": existing_task.title}
        )

        return None

    # ==================== Bulk Operations ====================

    @router.post("/projects/{project_id}/tasks/bulk/status", response_model=dict)
    def bulk_update_status(
        project_id: str,
        data: TaskBulkStatusUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Bulk update status for multiple tasks.

        Requires: editor role or higher
        """
        # Check permissions
        project, user_role = permission_checker.require_project_access(
            project_id, "editor", db, current_user
        )

        try:
            count = service.bulk_update_status(
                db, project_id, data.task_ids, data.status, current_user.id
            )

            # Log activity
            from app.modules.collaboration.service import collaboration_service
            collaboration_service.log_activity(
                db, project_id, current_user.id, "tasks.bulk_status_update",
                {"count": count, "status": data.status, "task_ids": data.task_ids}
            )

            return {"updated": count}

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @router.post("/projects/{project_id}/tasks/bulk/assign", response_model=dict)
    def bulk_assign_tasks(
        project_id: str,
        data: TaskBulkAssignUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Bulk assign tasks to a user.

        Requires: editor role or higher
        """
        # Check permissions
        project, user_role = permission_checker.require_project_access(
            project_id, "editor", db, current_user
        )

        count = service.bulk_assign(
            db, project_id, data.task_ids, data.assignee_id, current_user.id
        )

        # Log activity
        from app.modules.collaboration.service import collaboration_service
        collaboration_service.log_activity(
            db, project_id, current_user.id, "tasks.bulk_assign",
            {"count": count, "assignee_id": data.assignee_id, "task_ids": data.task_ids}
        )

        return {"updated": count}

    # ==================== Task Reordering (Kanban) ====================

    @router.post("/projects/{project_id}/tasks/reorder", response_model=dict)
    def reorder_tasks(
        project_id: str,
        data: TaskReorderRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Batch reorder tasks within a status column (for Kanban board).

        Requires: editor role or higher
        """
        # Check permissions
        project, user_role = permission_checker.require_project_access(
            project_id, "editor", db, current_user
        )

        try:
            # Convert to list of tuples
            task_positions = [(order.id, order.position) for order in data.orders]

            count = service.reorder_tasks(
                db, project_id, data.status, task_positions, current_user.id
            )

            # Log activity
            from app.modules.collaboration.service import collaboration_service
            collaboration_service.log_activity(
                db, project_id, current_user.id, "tasks.reordered",
                {"status": data.status, "count": count}
            )

            return {"updated": count, "status": data.status}

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @router.post("/projects/{project_id}/tasks/{task_id}/move", response_model=TaskResponse)
    def move_task(
        project_id: str,
        task_id: int,
        data: TaskMoveRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Move a task to different status and position (drag across Kanban columns).

        Requires: editor role or higher
        """
        # Check permissions
        project, user_role = permission_checker.require_project_access(
            project_id, "editor", db, current_user
        )

        try:
            task = service.move_task(
                db, task_id, data.new_status, data.new_position, current_user.id
            )

            # Get user details for response
            assignee = None
            if task.assignee_id:
                assignee_user = db.query(User).filter(User.id == task.assignee_id).first()
                if assignee_user:
                    assignee = {
                        "id": assignee_user.id,
                        "email": assignee_user.email,
                        "full_name": assignee_user.full_name
                    }

            creator = db.query(User).filter(User.id == task.created_by).first()

            # Log activity
            from app.modules.collaboration.service import collaboration_service
            collaboration_service.log_activity(
                db, project_id, current_user.id, "task.moved",
                {"task_id": task.id, "new_status": data.new_status, "new_position": data.new_position}
            )

            return {
                "id": task.id,
                "project_id": task.project_id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "due_date": task.due_date,
                "start_date": task.start_date,
                "type": task.type,
                "labels": task.labels or [],
                "linked_resource_type": task.linked_resource_type,
                "linked_resource_id": task.linked_resource_id,
                "boq_item_id": task.boq_item_id,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "assignee": assignee,
                "created_by_user": {
                    "id": creator.id,
                    "email": creator.email,
                    "full_name": creator.full_name
                } if creator else None
            }

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # ==================== Revisions ====================

    @router.get("/tasks/{task_id}/revisions", response_model=List[TaskRevisionResponse])
    def get_task_revisions(
        task_id: int,
        limit: int = Query(50, ge=1, le=200),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Get revision history for a task.

        Requires: viewer role or higher
        """
        # Get task to check project
        task = service.get_task(db, task_id)

        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        # Check permissions
        project, user_role = permission_checker.require_project_access(
            task.project_id, "viewer", db, current_user
        )

        revisions = service.get_task_revisions(db, task_id, limit)

        # Enrich with user details
        result = []
        for revision in revisions:
            changed_by_user = db.query(User).filter(User.id == revision.changed_by).first()

            result.append({
                "id": revision.id,
                "task_id": revision.task_id,
                "project_id": revision.project_id,
                "changed_by": revision.changed_by,
                "changes": json.loads(revision.changes),
                "created_at": revision.created_at,
                "changed_by_user": {
                    "id": changed_by_user.id,
                    "email": changed_by_user.email,
                    "full_name": changed_by_user.full_name
                } if changed_by_user else None
            })

        return result

    # ==================== Dashboard / KPIs ====================

    @router.get("/projects/{project_id}/dashboard", response_model=ProjectKPIs)
    def get_project_dashboard(
        project_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Get project KPIs and metrics for dashboard.

        Requires: viewer role or higher
        """
        # Check permissions
        project, user_role = permission_checker.require_project_access(
            project_id, "viewer", db, current_user
        )

        kpis = service.get_project_kpis(db, project_id)

        return kpis

    # ==================== Timeline/Gantt View ====================

    @router.get("/projects/{project_id}/tasks/timeline", response_model=List[TaskResponse])
    def get_timeline_tasks(
        project_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Get tasks for timeline/Gantt view.

        Only returns tasks with start_date or due_date set.
        Optionally filter by date range.

        Requires: viewer role or higher
        """
        # Check permissions
        project, user_role = permission_checker.require_project_access(
            project_id, "viewer", db, current_user
        )

        # Parse date parameters
        start_date_obj = None
        end_date_obj = None

        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")

        # Get timeline tasks
        tasks = service.get_timeline_tasks(db, project_id, start_date_obj, end_date_obj)

        # Log activity
        from app.modules.collaboration.service import collaboration_service
        collaboration_service.log_activity(
            db, project_id, current_user.id, "view_timeline",
            {"task_count": len(tasks)}
        )

        # Enrich with user details
        result = []
        for task in tasks:
            assignee_user = None
            if task.assignee_id:
                assignee_user = db.query(User).filter(User.id == task.assignee_id).first()

            creator_user = db.query(User).filter(User.id == task.created_by).first()

            result.append({
                "id": task.id,
                "project_id": task.project_id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "assignee_id": task.assignee_id,
                "due_date": task.due_date,
                "start_date": task.start_date,
                "type": task.type,
                "labels": task.labels or [],
                "linked_resource_type": task.linked_resource_type,
                "linked_resource_id": task.linked_resource_id,
                "position": task.position,
                "created_by": task.created_by,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "assignee": {
                    "id": assignee_user.id,
                    "email": assignee_user.email,
                    "full_name": assignee_user.full_name
                } if assignee_user else None,
                "creator": {
                    "id": creator_user.id,
                    "email": creator_user.email,
                    "full_name": creator_user.full_name
                } if creator_user else None
            })

        return result

    # ==================== Task Attachments ====================

    @router.post("/tasks/{task_id}/attachments", status_code=status.HTTP_201_CREATED)
    async def upload_task_attachment(
        task_id: int,
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Upload an attachment to a task.

        Requires: editor role or higher on the project
        """
        # Get task and check project access
        task = service.get_task(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Check permissions
        project, user_role = permission_checker.require_project_access(
            task.project_id, "editor", db, current_user
        )

        # Validate file size (max 50MB)
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to start

        if file_size > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(status_code=400, detail="File too large (max 50MB)")

        # Upload attachment
        try:
            attachment = service.upload_attachment(
                db=db,
                task_id=task_id,
                filename=file.filename or "unnamed",
                file=file.file,
                mime_type=file.content_type,
                user_id=current_user.id
            )

            # Log activity
            from app.modules.collaboration.service import collaboration_service
            collaboration_service.log_activity(
                db, task.project_id, current_user.id, "upload_attachment",
                {"task_id": task_id, "filename": file.filename}
            )

            # Get uploader user details
            uploader = db.query(User).filter(User.id == attachment.uploaded_by).first()

            return {
                "id": attachment.id,
                "task_id": attachment.task_id,
                "filename": attachment.filename,
                "file_size": attachment.file_size,
                "mime_type": attachment.mime_type,
                "uploaded_by": attachment.uploaded_by,
                "uploaded_at": attachment.uploaded_at,
                "uploader": {
                    "id": uploader.id,
                    "email": uploader.email,
                    "full_name": uploader.full_name
                } if uploader else None
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    @router.get("/tasks/{task_id}/attachments")
    def list_task_attachments(
        task_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        List all attachments for a task.

        Requires: viewer role or higher on the project
        """
        # Get task and check project access
        task = service.get_task(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Check permissions
        project, user_role = permission_checker.require_project_access(
            task.project_id, "viewer", db, current_user
        )

        # Get attachments
        attachments = service.get_attachments(db, task_id)

        # Enrich with uploader details
        result = []
        for attachment in attachments:
            uploader = db.query(User).filter(User.id == attachment.uploaded_by).first()
            result.append({
                "id": attachment.id,
                "task_id": attachment.task_id,
                "filename": attachment.filename,
                "file_size": attachment.file_size,
                "mime_type": attachment.mime_type,
                "uploaded_by": attachment.uploaded_by,
                "uploaded_at": attachment.uploaded_at,
                "uploader": {
                    "id": uploader.id,
                    "email": uploader.email,
                    "full_name": uploader.full_name
                } if uploader else None
            })

        return result

    @router.get("/attachments/{attachment_id}/download")
    def download_attachment(
        attachment_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Download an attachment.

        Requires: viewer role or higher on the project
        """
        # Get attachment
        attachment = service.get_attachment(db, attachment_id)
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")

        # Get task and check project access
        task = service.get_task(db, attachment.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Check permissions
        project, user_role = permission_checker.require_project_access(
            task.project_id, "viewer", db, current_user
        )

        # Check if file exists
        file_path = Path(attachment.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on server")

        # Return file
        return FileResponse(
            path=str(file_path),
            filename=attachment.filename,
            media_type=attachment.mime_type or "application/octet-stream"
        )

    @router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_attachment(
        attachment_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Delete an attachment.

        Requires: editor role or higher on the project
        """
        # Get attachment
        attachment = service.get_attachment(db, attachment_id)
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")

        # Get task and check project access
        task = service.get_task(db, attachment.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Check permissions
        project, user_role = permission_checker.require_project_access(
            task.project_id, "editor", db, current_user
        )

        # Delete attachment
        success = service.delete_attachment(db, attachment_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete attachment")

        # Log activity
        from app.modules.collaboration.service import collaboration_service
        collaboration_service.log_activity(
            db, task.project_id, current_user.id, "delete_attachment",
            {"task_id": task.id, "filename": attachment.filename}
        )

    return router


# Default router instance for SkyBuild Pro
tasks_router = create_tasks_router(SKYBUILD_TASKS_CONFIG)
