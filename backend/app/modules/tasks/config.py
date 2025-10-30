"""
Tasks/PM Module Configuration

Reusable task management configuration for any project management system.
"""
from typing import List, Optional
from pydantic import BaseModel


class TasksModuleConfig(BaseModel):
    """
    Configuration for the tasks/PM module.

    Makes the module reusable across different project management systems.
    """
    # Feature toggles
    enable_kanban: bool = True
    enable_timeline: bool = True
    enable_assignments: bool = True
    enable_labels: bool = True
    enable_task_types: bool = True

    # Task statuses (customizable per project type)
    available_statuses: List[str] = ["todo", "in_progress", "done", "blocked"]

    # Task priorities
    available_priorities: List[str] = ["low", "medium", "high", "urgent"]

    # Task types (customizable: for construction vs general PM)
    # For SkyBuild: task, rfi, change, milestone
    # For generic PM: task, bug, feature, epic
    available_task_types: List[str] = ["task", "rfi", "change", "milestone"]

    # Limits
    max_tasks_per_project: Optional[int] = None  # None = unlimited
    max_labels_per_task: int = 10
    max_description_length: int = 10000

    # Dependencies
    enable_task_dependencies: bool = False  # Phase 2 feature
    enable_subtasks: bool = False  # Phase 2 feature

    # Linkage to other resources
    # For SkyBuild: can link tasks to BoQ items
    # For other systems: can link tasks to deals, documents, etc.
    linkable_resource_types: List[str] = ["boq_item"]

    # Filters
    enable_search: bool = True
    enable_filtering: bool = True
    enable_sorting: bool = True

    class Config:
        arbitrary_types_allowed = True


# Default configuration for SkyBuild Pro (Construction PM)
SKYBUILD_TASKS_CONFIG = TasksModuleConfig(
    available_statuses=["todo", "in_progress", "done", "blocked"],
    available_priorities=["low", "medium", "high", "urgent"],
    available_task_types=["task", "rfi", "change", "milestone"],
    linkable_resource_types=["boq_item"],
    enable_kanban=True,
    enable_timeline=True,
    enable_assignments=True,
    enable_labels=True,
)

# Example: Generic software PM configuration
GENERIC_PM_CONFIG = TasksModuleConfig(
    available_statuses=["backlog", "todo", "in_progress", "review", "done"],
    available_priorities=["low", "medium", "high", "critical"],
    available_task_types=["task", "bug", "feature", "epic"],
    linkable_resource_types=["document", "sprint"],
    enable_kanban=True,
    enable_timeline=True,
)
