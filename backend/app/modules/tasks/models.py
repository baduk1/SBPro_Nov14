"""
Tasks/PM Module - Database Models

Reusable task management models for any project management system.
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, CheckConstraint, Text, BigInteger, Date, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class Task(Base):
    """
    Task model for project management.

    Can be linked to various resource types (BoQ items, documents, etc.)
    """
    __tablename__ = "tasks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # Task details
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)

    # Status and priority
    status = Column(String(24), nullable=False, default='todo')
    priority = Column(String(16), nullable=True)  # low, medium, high, urgent

    # Assignment
    assignee_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Dates
    due_date = Column(Date, nullable=True)
    start_date = Column(Date, nullable=True)

    # Task type (for categorization)
    type = Column(String(24), nullable=True)  # task, rfi, change, milestone

    # Linkage to other resources (e.g., BoQ item)
    # For flexibility, store as generic reference
    linked_resource_type = Column(String(24), nullable=True)  # 'boq_item', 'document', etc.
    linked_resource_id = Column(String, nullable=True)  # ID of the linked resource

    # For backward compatibility with spec
    boq_item_id = Column(String, nullable=True)  # Direct link to BoQ item (deprecated, use linked_resource_*)

    # Labels (array of strings)
    # Note: SQLite doesn't support arrays, will store as JSON string in migration
    labels = Column(ARRAY(String), nullable=True)

    # Audit fields
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_tasks_project', 'project_id'),
        Index('idx_tasks_assignee', 'assignee_id'),
        Index('idx_tasks_status', 'status'),
        Index('idx_tasks_due_date', 'due_date'),
        Index('idx_tasks_created_by', 'created_by'),
    )

    def __repr__(self):
        return f"<Task id={self.id} title='{self.title}' status={self.status}>"


class TaskRevision(Base):
    """
    Task revision history for tracking changes.

    Stores what changed, who changed it, and when.
    """
    __tablename__ = "task_revisions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_id = Column(BigInteger, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # Who made the change
    changed_by = Column(String, ForeignKey("users.id"), nullable=False)

    # What changed (JSON structure)
    # Example: {"status": {"old": "todo", "new": "in_progress"}, "assignee_id": {"old": null, "new": "user-123"}}
    changes = Column(Text, nullable=False)  # JSON string

    # When
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_task_rev_task', 'task_id'),
        Index('idx_task_rev_project', 'project_id'),
        Index('idx_task_rev_created', 'created_at'),
    )

    def __repr__(self):
        return f"<TaskRevision task_id={self.task_id} changed_by={self.changed_by}>"


class TaskDependency(Base):
    """
    Task dependencies for ordering tasks.

    Phase 2 feature: tracks which tasks must be completed before others.
    """
    __tablename__ = "task_dependencies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_id = Column(BigInteger, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    depends_on_task_id = Column(BigInteger, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)

    # Dependency type: 'blocks', 'blocked_by', 'relates_to'
    dependency_type = Column(String(16), nullable=False, default='blocks')

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_task_deps_task', 'task_id'),
        Index('idx_task_deps_depends', 'depends_on_task_id'),
        CheckConstraint("dependency_type IN ('blocks', 'blocked_by', 'relates_to')", name='check_dep_type'),
        # Prevent self-dependency
        CheckConstraint("task_id != depends_on_task_id", name='check_no_self_dep'),
    )

    def __repr__(self):
        return f"<TaskDependency task={self.task_id} depends_on={self.depends_on_task_id}>"


class TaskAttachment(Base):
    """
    File attachments for tasks.

    Phase 2 feature: allows uploading files to tasks.
    """
    __tablename__ = "task_attachments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    task_id = Column(BigInteger, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)

    # File info
    filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)  # Path in storage
    file_size = Column(BigInteger, nullable=True)  # Size in bytes
    mime_type = Column(String(100), nullable=True)

    # Upload info
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_task_attach_task', 'task_id'),
    )

    def __repr__(self):
        return f"<TaskAttachment task={self.task_id} file={self.filename}>"
