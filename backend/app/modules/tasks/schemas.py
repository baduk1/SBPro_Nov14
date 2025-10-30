"""
Tasks/PM Module - Pydantic Schemas

Request/response schemas for tasks API.
"""
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field


# ==================== Tasks ====================

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500, description="Task title")
    description: Optional[str] = Field(None, max_length=10000, description="Task description")
    status: str = Field(..., description="Task status")
    priority: Optional[str] = Field(None, description="Task priority")
    assignee_id: Optional[str] = Field(None, description="Assigned user ID")
    due_date: Optional[date] = Field(None, description="Due date")
    start_date: Optional[date] = Field(None, description="Start date")
    type: Optional[str] = Field(None, description="Task type")
    labels: Optional[List[str]] = Field(None, description="Task labels")


class TaskCreate(TaskBase):
    """Schema for creating a new task"""
    # Optional linkage
    linked_resource_type: Optional[str] = Field(None, description="Resource type to link (e.g., 'boq_item')")
    linked_resource_id: Optional[str] = Field(None, description="Resource ID to link")
    boq_item_id: Optional[str] = Field(None, description="BoQ item ID (legacy support)")


class TaskUpdate(BaseModel):
    """Schema for updating a task (all fields optional)"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=10000)
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    type: Optional[str] = None
    labels: Optional[List[str]] = None
    linked_resource_type: Optional[str] = None
    linked_resource_id: Optional[str] = None
    boq_item_id: Optional[str] = None


class TaskInDB(TaskBase):
    """Task as stored in database"""
    id: int
    project_id: str
    linked_resource_type: Optional[str] = None
    linked_resource_id: Optional[str] = None
    boq_item_id: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    """Task response with enriched data"""
    id: int
    project_id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: Optional[str] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    type: Optional[str] = None
    labels: Optional[List[str]] = None
    linked_resource_type: Optional[str] = None
    linked_resource_id: Optional[str] = None
    boq_item_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Enriched data
    assignee: Optional[dict] = None  # {id, email, full_name}
    created_by_user: Optional[dict] = None  # {id, email, full_name}

    # Optional: linked resource details
    linked_resource: Optional[dict] = None  # Details of linked resource if fetched

    class Config:
        from_attributes = True


# ==================== Task Filters ====================

class TaskFilter(BaseModel):
    """Query parameters for filtering tasks"""
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[str] = None
    type: Optional[str] = None
    labels: Optional[List[str]] = None  # Tasks with any of these labels
    search: Optional[str] = None  # Search in title/description
    due_before: Optional[date] = None
    due_after: Optional[date] = None
    overdue: Optional[bool] = None
    unassigned: Optional[bool] = None

    # Pagination
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=200)

    # Sorting
    sort_by: Optional[str] = Field(default="created_at", description="Field to sort by")
    sort_order: Optional[str] = Field(default="desc", description="asc or desc")


# ==================== Task Revisions ====================

class TaskRevisionResponse(BaseModel):
    """Task revision history entry"""
    id: int
    task_id: int
    project_id: str
    changed_by: str
    changes: dict  # Parsed JSON
    created_at: datetime

    # Enriched data
    changed_by_user: Optional[dict] = None  # {id, email, full_name}

    class Config:
        from_attributes = True


# ==================== Task Dependencies (Phase 2) ====================

class TaskDependencyCreate(BaseModel):
    """Create a task dependency"""
    task_id: int
    depends_on_task_id: int
    dependency_type: str = Field(default="blocks", description="blocks, blocked_by, or relates_to")


class TaskDependencyResponse(BaseModel):
    """Task dependency response"""
    id: int
    task_id: int
    depends_on_task_id: int
    dependency_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Bulk Operations ====================

class TaskBulkUpdate(BaseModel):
    """Bulk update multiple tasks"""
    task_ids: List[int] = Field(..., min_length=1, max_length=100)
    updates: TaskUpdate


class TaskBulkStatusUpdate(BaseModel):
    """Bulk status update (common operation)"""
    task_ids: List[int] = Field(..., min_length=1, max_length=100)
    status: str


class TaskBulkAssignUpdate(BaseModel):
    """Bulk assignment update"""
    task_ids: List[int] = Field(..., min_length=1, max_length=100)
    assignee_id: Optional[str]


# ==================== Project KPIs ====================

class ProjectKPIs(BaseModel):
    """Project-level KPIs for dashboard"""
    total_tasks: int
    tasks_by_status: dict  # {"todo": 5, "in_progress": 3, "done": 10}
    tasks_by_priority: dict  # {"high": 2, "medium": 8, "low": 8}
    overdue_tasks: int
    tasks_due_this_week: int
    tasks_due_next_week: int
    completion_percentage: float  # 0-100
    average_completion_time_days: Optional[float] = None  # Average days to complete

    # Optional: cost-related (for construction PM)
    estimated_total_cost: Optional[float] = None
    actual_total_cost: Optional[float] = None

    class Config:
        from_attributes = True
