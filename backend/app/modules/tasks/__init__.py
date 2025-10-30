"""
Tasks/PM Module

Reusable task management and project management features.

Features:
- Task CRUD with filtering and search
- Task assignments and due dates
- Task statuses and priorities
- Task types and labels
- Bulk operations
- Revision history
- Project KPIs and dashboard metrics

Usage in any FastAPI project:
    from app.modules.tasks import tasks_router
    app.include_router(tasks_router, prefix="/api/v1")
"""

from app.modules.tasks.router import create_tasks_router, tasks_router
from app.modules.tasks.config import TasksModuleConfig, SKYBUILD_TASKS_CONFIG
from app.modules.tasks.service import TasksService, tasks_service
from app.modules.tasks.models import Task, TaskRevision, TaskDependency, TaskAttachment
from app.modules.tasks.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskFilter,
    TaskBulkStatusUpdate,
    TaskBulkAssignUpdate,
    ProjectKPIs
)

__all__ = [
    # Router
    "create_tasks_router",
    "tasks_router",

    # Configuration
    "TasksModuleConfig",
    "SKYBUILD_TASKS_CONFIG",

    # Services
    "TasksService",
    "tasks_service",

    # Models
    "Task",
    "TaskRevision",
    "TaskDependency",
    "TaskAttachment",

    # Schemas
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "TaskFilter",
    "TaskBulkStatusUpdate",
    "TaskBulkAssignUpdate",
    "ProjectKPIs",
]
