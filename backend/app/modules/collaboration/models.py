"""
Collaboration Module - Database Models

Reusable collaboration models that can work with any parent resource.
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Index, CheckConstraint, Text, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class ProjectCollaborator(Base):
    """
    Project collaborators with role-based access.

    Tracks who has access to a project and their permission level.
    """
    __tablename__ = "project_collaborators"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(16), nullable=False)  # owner, editor, viewer

    # Audit fields
    invited_by = Column(String, ForeignKey("users.id"), nullable=False)
    invited_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    # Ensure unique user per project
    __table_args__ = (
        Index('idx_collab_project', 'project_id'),
        Index('idx_collab_user', 'user_id'),
        Index('idx_collab_project_user', 'project_id', 'user_id', unique=True),
        CheckConstraint("role IN ('owner', 'editor', 'viewer')", name='check_role'),
    )

    def __repr__(self):
        return f"<ProjectCollaborator project={self.project_id} user={self.user_id} role={self.role}>"


class ProjectInvitation(Base):
    """
    Pending invitations to collaborate on a project.

    Stores invitation tokens and tracks invitation lifecycle.
    """
    __tablename__ = "project_invitations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False)  # Can invite non-users
    role = Column(String(16), nullable=False)  # editor, viewer (not owner)

    # Security: store only hash of token
    token_hash = Column(Text, nullable=False, unique=True, index=True)

    # Status tracking
    status = Column(String(16), nullable=False, default='pending')  # pending, accepted, revoked, expired

    # Audit fields
    invited_by = Column(String, ForeignKey("users.id"), nullable=False)
    invited_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index('idx_invites_project', 'project_id'),
        Index('idx_invites_email', 'email'),
        Index('idx_invites_status', 'status'),
        CheckConstraint("role IN ('editor', 'viewer')", name='check_invite_role'),
        CheckConstraint("status IN ('pending', 'accepted', 'revoked', 'expired')", name='check_status'),
    )

    def __repr__(self):
        return f"<ProjectInvitation project={self.project_id} email={self.email} status={self.status}>"


class Comment(Base):
    """
    Comments on various resources (projects, BoQ items, tasks, etc.)

    Generic comment model that works with different context types.
    """
    __tablename__ = "comments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Context: what is being commented on
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    context_type = Column(String(16), nullable=False)  # 'boq', 'task', 'project'
    context_id = Column(String, nullable=False)  # ID of the resource being commented on

    # Comment content
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)

    # Threading support
    parent_id = Column(BigInteger, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    replies = relationship("Comment", backref="parent", remote_side=[id], cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_comments_project_context', 'project_id', 'context_type', 'context_id'),
        Index('idx_comments_author', 'author_id'),
        Index('idx_comments_created', 'created_at'),
        CheckConstraint("context_type IN ('boq', 'task', 'project')", name='check_context_type'),
    )

    def __repr__(self):
        return f"<Comment id={self.id} context={self.context_type}:{self.context_id} author={self.author_id}>"


class Activity(Base):
    """
    Activity log for tracking changes and events in projects.

    Provides audit trail and feeds for user notifications.
    """
    __tablename__ = "activities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    # Actor
    actor_id = Column(String, ForeignKey("users.id"), nullable=False)

    # Event details
    type = Column(String(64), nullable=False)  # 'boq.updated', 'task.created', 'member.added'
    payload = Column(Text, nullable=False)  # JSON string with event details

    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_activities_project_created', 'project_id', 'created_at'),
        Index('idx_activities_type', 'type'),
        Index('idx_activities_actor', 'actor_id'),
    )

    def __repr__(self):
        return f"<Activity id={self.id} type={self.type} project={self.project_id}>"


class Notification(Base):
    """
    User notifications for mentions, invites, and important events.

    In-app notification system.
    """
    __tablename__ = "notifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Optional project context
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)

    # Notification details
    type = Column(String(64), nullable=False)  # 'mention', 'invite', 'task.assigned'
    payload = Column(Text, nullable=False)  # JSON string with notification details

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index('idx_notifications_user_unread', 'user_id', 'read_at'),
        Index('idx_notifications_created', 'created_at'),
    )

    def __repr__(self):
        return f"<Notification id={self.id} user={self.user_id} type={self.type} read={self.read_at is not None}>"
