"""
Tasks/PM Module - Business Logic Service

Reusable service layer for task management features.
"""
import json
from typing import List, Optional, Tuple, Dict
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, case

from app.modules.tasks.models import Task, TaskRevision
from app.modules.tasks.schemas import TaskCreate, TaskUpdate, TaskFilter
from app.modules.tasks.config import TasksModuleConfig, SKYBUILD_TASKS_CONFIG


class TasksService:
    """
    Service layer for task management features.

    Handles business logic, validation, and database operations.
    """

    def __init__(self, config: TasksModuleConfig = SKYBUILD_TASKS_CONFIG):
        self.config = config

    # ==================== CRUD Operations ====================

    def create_task(
        self,
        db: Session,
        project_id: str,
        data: TaskCreate,
        creator_id: str
    ) -> Task:
        """
        Create a new task.

        Validates against configuration and creates task with revision history.
        """
        # Validate status
        if data.status not in self.config.available_statuses:
            raise ValueError(f"Invalid status: {data.status}. Must be one of {self.config.available_statuses}")

        # Validate priority
        if data.priority and data.priority not in self.config.available_priorities:
            raise ValueError(f"Invalid priority: {data.priority}")

        # Validate type
        if data.type and data.type not in self.config.available_task_types:
            raise ValueError(f"Invalid type: {data.type}")

        # Validate labels
        if data.labels and len(data.labels) > self.config.max_labels_per_task:
            raise ValueError(f"Too many labels (max {self.config.max_labels_per_task})")

        # Check max tasks limit
        if self.config.max_tasks_per_project:
            count = db.query(Task).filter(Task.project_id == project_id).count()
            if count >= self.config.max_tasks_per_project:
                raise ValueError(f"Maximum tasks limit reached ({self.config.max_tasks_per_project})")

        # Create task
        task = Task(
            project_id=project_id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            assignee_id=data.assignee_id,
            due_date=data.due_date,
            start_date=data.start_date,
            type=data.type,
            labels=data.labels or [],
            linked_resource_type=data.linked_resource_type,
            linked_resource_id=data.linked_resource_id,
            boq_item_id=data.boq_item_id,  # Legacy support
            created_by=creator_id
        )

        db.add(task)
        db.commit()
        db.refresh(task)

        return task

    def get_task(
        self,
        db: Session,
        task_id: int,
        project_id: Optional[str] = None
    ) -> Optional[Task]:
        """Get a single task by ID."""
        query = db.query(Task).filter(Task.id == task_id)

        if project_id:
            query = query.filter(Task.project_id == project_id)

        return query.first()

    def get_tasks(
        self,
        db: Session,
        project_id: str,
        filters: Optional[TaskFilter] = None
    ) -> Tuple[List[Task], int]:
        """
        Get tasks with filtering, searching, sorting, and pagination.

        Returns: (tasks, total_count)
        """
        query = db.query(Task).filter(Task.project_id == project_id)

        # Apply filters
        if filters:
            if filters.status:
                query = query.filter(Task.status == filters.status)

            if filters.priority:
                query = query.filter(Task.priority == filters.priority)

            if filters.assignee_id:
                query = query.filter(Task.assignee_id == filters.assignee_id)

            if filters.type:
                query = query.filter(Task.type == filters.type)

            if filters.labels:
                # SQLite doesn't support array operators, will need to handle in app layer
                # For now, skip or implement as JSON contains
                pass

            if filters.search:
                search_pattern = f"%{filters.search}%"
                query = query.filter(
                    or_(
                        Task.title.ilike(search_pattern),
                        Task.description.ilike(search_pattern)
                    )
                )

            if filters.due_before:
                query = query.filter(Task.due_date <= filters.due_before)

            if filters.due_after:
                query = query.filter(Task.due_date >= filters.due_after)

            if filters.overdue:
                today = date.today()
                query = query.filter(
                    Task.due_date < today,
                    Task.status != 'done'
                )

            if filters.unassigned:
                query = query.filter(Task.assignee_id.is_(None))

        # Get total count before pagination
        total_count = query.count()

        # Apply sorting
        if filters and filters.sort_by:
            sort_column = getattr(Task, filters.sort_by, Task.created_at)
            if filters.sort_order == 'asc':
                query = query.order_by(sort_column.asc())
            else:
                query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(Task.created_at.desc())

        # Apply pagination
        if filters:
            offset = (filters.page - 1) * filters.limit
            query = query.offset(offset).limit(filters.limit)

        tasks = query.all()
        return tasks, total_count

    def update_task(
        self,
        db: Session,
        task_id: int,
        data: TaskUpdate,
        user_id: str
    ) -> Task:
        """
        Update a task and record revision history.
        """
        task = db.query(Task).filter(Task.id == task_id).first()

        if not task:
            raise ValueError("Task not found")

        # Track changes for revision history
        changes = {}

        # Update fields
        update_data = data.model_dump(exclude_unset=True)

        for field, new_value in update_data.items():
            old_value = getattr(task, field)

            # Validate new value if needed
            if field == 'status' and new_value not in self.config.available_statuses:
                raise ValueError(f"Invalid status: {new_value}")
            if field == 'priority' and new_value and new_value not in self.config.available_priorities:
                raise ValueError(f"Invalid priority: {new_value}")
            if field == 'type' and new_value and new_value not in self.config.available_task_types:
                raise ValueError(f"Invalid type: {new_value}")

            # Track change if value actually changed
            if old_value != new_value:
                changes[field] = {"old": old_value, "new": new_value}
                setattr(task, field, new_value)

        # Update timestamp
        task.updated_at = datetime.utcnow()

        # Record revision if there were changes
        if changes:
            revision = TaskRevision(
                task_id=task.id,
                project_id=task.project_id,
                changed_by=user_id,
                changes=json.dumps(changes)
            )
            db.add(revision)

        db.commit()
        db.refresh(task)

        return task

    def delete_task(
        self,
        db: Session,
        task_id: int
    ) -> bool:
        """Delete a task."""
        task = db.query(Task).filter(Task.id == task_id).first()

        if not task:
            return False

        db.delete(task)
        db.commit()
        return True

    # ==================== Bulk Operations ====================

    def bulk_update_status(
        self,
        db: Session,
        project_id: str,
        task_ids: List[int],
        status: str,
        user_id: str
    ) -> int:
        """
        Bulk update status for multiple tasks.

        Returns: count of updated tasks
        """
        if status not in self.config.available_statuses:
            raise ValueError(f"Invalid status: {status}")

        # Update tasks
        tasks = db.query(Task).filter(
            Task.id.in_(task_ids),
            Task.project_id == project_id
        ).all()

        count = 0
        for task in tasks:
            if task.status != status:
                # Record revision
                changes = {"status": {"old": task.status, "new": status}}
                revision = TaskRevision(
                    task_id=task.id,
                    project_id=task.project_id,
                    changed_by=user_id,
                    changes=json.dumps(changes)
                )
                db.add(revision)

                task.status = status
                task.updated_at = datetime.utcnow()
                count += 1

        db.commit()
        return count

    def bulk_assign(
        self,
        db: Session,
        project_id: str,
        task_ids: List[int],
        assignee_id: Optional[str],
        user_id: str
    ) -> int:
        """
        Bulk assign tasks to a user.

        Returns: count of updated tasks
        """
        tasks = db.query(Task).filter(
            Task.id.in_(task_ids),
            Task.project_id == project_id
        ).all()

        count = 0
        for task in tasks:
            if task.assignee_id != assignee_id:
                # Record revision
                changes = {"assignee_id": {"old": task.assignee_id, "new": assignee_id}}
                revision = TaskRevision(
                    task_id=task.id,
                    project_id=task.project_id,
                    changed_by=user_id,
                    changes=json.dumps(changes)
                )
                db.add(revision)

                task.assignee_id = assignee_id
                task.updated_at = datetime.utcnow()
                count += 1

        db.commit()
        return count

    # ==================== Revision History ====================

    def get_task_revisions(
        self,
        db: Session,
        task_id: int,
        limit: int = 50
    ) -> List[TaskRevision]:
        """Get revision history for a task."""
        return db.query(TaskRevision).filter(
            TaskRevision.task_id == task_id
        ).order_by(TaskRevision.created_at.desc()).limit(limit).all()

    # ==================== KPIs & Dashboard ====================

    def get_project_kpis(
        self,
        db: Session,
        project_id: str
    ) -> Dict:
        """
        Calculate project KPIs for dashboard.

        Returns comprehensive project metrics.
        """
        # Total tasks
        total_tasks = db.query(Task).filter(Task.project_id == project_id).count()

        # Tasks by status
        status_counts = db.query(
            Task.status,
            func.count(Task.id).label('count')
        ).filter(
            Task.project_id == project_id
        ).group_by(Task.status).all()

        tasks_by_status = {status: count for status, count in status_counts}

        # Tasks by priority
        priority_counts = db.query(
            Task.priority,
            func.count(Task.id).label('count')
        ).filter(
            Task.project_id == project_id,
            Task.priority.isnot(None)
        ).group_by(Task.priority).all()

        tasks_by_priority = {priority: count for priority, count in priority_counts}

        # Overdue tasks
        today = date.today()
        overdue_tasks = db.query(Task).filter(
            Task.project_id == project_id,
            Task.due_date < today,
            Task.status != 'done'
        ).count()

        # Tasks due this week
        week_end = today + timedelta(days=7)
        tasks_due_this_week = db.query(Task).filter(
            Task.project_id == project_id,
            Task.due_date >= today,
            Task.due_date <= week_end,
            Task.status != 'done'
        ).count()

        # Tasks due next week
        next_week_start = week_end + timedelta(days=1)
        next_week_end = next_week_start + timedelta(days=7)
        tasks_due_next_week = db.query(Task).filter(
            Task.project_id == project_id,
            Task.due_date >= next_week_start,
            Task.due_date <= next_week_end,
            Task.status != 'done'
        ).count()

        # Completion percentage
        done_count = tasks_by_status.get('done', 0)
        completion_percentage = (done_count / total_tasks * 100) if total_tasks > 0 else 0

        return {
            "total_tasks": total_tasks,
            "tasks_by_status": tasks_by_status,
            "tasks_by_priority": tasks_by_priority,
            "overdue_tasks": overdue_tasks,
            "tasks_due_this_week": tasks_due_this_week,
            "tasks_due_next_week": tasks_due_next_week,
            "completion_percentage": round(completion_percentage, 2)
        }


# Global service instance
tasks_service = TasksService()
