"""
Collaboration Module - Pydantic Schemas

Request/response schemas for collaboration APIs.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ==================== Collaborators ====================

class CollaboratorBase(BaseModel):
    role: str = Field(..., description="Role: owner, editor, or viewer")


class CollaboratorCreate(CollaboratorBase):
    user_id: str = Field(..., description="User ID to add as collaborator")


class CollaboratorUpdate(BaseModel):
    role: str = Field(..., description="New role for the collaborator")


class CollaboratorInDB(CollaboratorBase):
    id: int
    project_id: str
    user_id: str
    invited_by: str
    invited_at: datetime
    accepted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CollaboratorResponse(BaseModel):
    """Response with user details embedded"""
    id: int
    project_id: str
    role: str
    invited_at: datetime
    accepted_at: Optional[datetime] = None
    user: dict  # Will contain: id, email, full_name

    class Config:
        from_attributes = True


# ==================== Invitations ====================

class InvitationCreate(BaseModel):
    email: EmailStr = Field(..., description="Email address to invite")
    role: str = Field(..., description="Role: editor or viewer")
    expires_in_days: int = Field(default=7, ge=1, le=30, description="Days until invitation expires")


class InvitationResponse(BaseModel):
    id: int
    project_id: str
    email: str
    role: str
    status: str
    invited_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvitationAccept(BaseModel):
    token: str = Field(..., description="Invitation token from email")


# ==================== Comments ====================

class CommentCreate(BaseModel):
    context_type: str = Field(..., description="Type of resource: boq, task, project")
    context_id: str = Field(..., description="ID of the resource being commented on")
    body: str = Field(..., min_length=1, max_length=5000, description="Comment text")
    parent_id: Optional[int] = Field(None, description="Parent comment ID for threading")


class CommentUpdate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000, description="Updated comment text")


class CommentResponse(BaseModel):
    id: int
    project_id: str
    context_type: str
    context_id: str
    body: str
    author_id: str
    parent_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Embedded author info
    author: Optional[dict] = None  # {id, email, full_name}

    # Nested replies (optional, for threaded display)
    replies: Optional[List['CommentResponse']] = None

    class Config:
        from_attributes = True


# ==================== Activities ====================

class ActivityResponse(BaseModel):
    id: int
    project_id: str
    actor_id: str
    type: str
    payload: dict  # Parsed JSON
    created_at: datetime

    # Embedded actor info
    actor: Optional[dict] = None  # {id, email, full_name}

    class Config:
        from_attributes = True


class ActivityQuery(BaseModel):
    """Query parameters for filtering activities"""
    since: Optional[datetime] = None
    type: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=200)


# ==================== Notifications ====================

class NotificationResponse(BaseModel):
    id: int
    user_id: str
    project_id: Optional[str] = None
    type: str
    payload: dict  # Parsed JSON
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    notification_ids: List[int] = Field(..., description="List of notification IDs to mark as read")


# ==================== Permissions ====================

class PermissionCheck(BaseModel):
    """Response for permission checks"""
    allowed: bool
    user_role: Optional[str] = None
    required_role: str
    message: Optional[str] = None


# Enable forward references for recursive models
CommentResponse.model_rebuild()
