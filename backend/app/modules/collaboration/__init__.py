"""
Collaboration Module

Reusable collaboration features for multi-user projects.

Features:
- Role-based access control (RBAC)
- Project collaborators management
- Invitations via email
- Comments and mentions
- Activity logging
- Notifications

Usage in any FastAPI project:
    from app.modules.collaboration import collaboration_router
    app.include_router(collaboration_router, prefix="/api/v1")
"""

from app.modules.collaboration.router import create_collaboration_router, collaboration_router
from app.modules.collaboration.config import CollaborationConfig, SKYBUILD_COLLABORATION_CONFIG
from app.modules.collaboration.service import CollaborationService, collaboration_service
from app.modules.collaboration.permissions import PermissionChecker, permission_checker
from app.modules.collaboration.models import (
    ProjectCollaborator,
    ProjectInvitation,
    Comment,
    Activity,
    Notification
)
from app.modules.collaboration.schemas import (
    CollaboratorResponse,
    CollaboratorCreate,
    InvitationCreate,
    InvitationResponse,
    CommentCreate,
    CommentResponse,
    ActivityResponse,
    NotificationResponse
)

__all__ = [
    # Router
    "create_collaboration_router",
    "collaboration_router",

    # Configuration
    "CollaborationConfig",
    "SKYBUILD_COLLABORATION_CONFIG",

    # Services
    "CollaborationService",
    "collaboration_service",

    # Permissions
    "PermissionChecker",
    "permission_checker",

    # Models
    "ProjectCollaborator",
    "ProjectInvitation",
    "Comment",
    "Activity",
    "Notification",

    # Schemas
    "CollaboratorResponse",
    "CollaboratorCreate",
    "InvitationCreate",
    "InvitationResponse",
    "CommentCreate",
    "CommentResponse",
    "ActivityResponse",
    "NotificationResponse",
]
