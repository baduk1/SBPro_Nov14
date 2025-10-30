"""
Collaboration Module Configuration

This module is designed to be reusable across different projects.
Configure it to match your project's needs.
"""
from typing import List, Optional, Callable
from pydantic import BaseModel


class CollaborationConfig(BaseModel):
    """
    Configuration for the collaboration module.

    This makes the module reusable across different CRM/project management systems.
    """
    # Features toggles
    enable_comments: bool = True
    enable_invitations: bool = True
    enable_activity_log: bool = True
    enable_version_history: bool = True

    # Role configuration
    available_roles: List[str] = ["owner", "editor", "viewer"]
    role_hierarchy: dict = {
        "owner": 3,
        "editor": 2,
        "viewer": 1
    }

    # Context types (what can be collaborated on)
    # For SkyBuild: ["project", "boq", "task"]
    # For other CRM: ["deal", "document", "pipeline"]
    context_types: List[str] = ["project"]

    # Invitation settings
    invitation_expiry_days: int = 7
    max_collaborators_per_resource: Optional[int] = None  # None = unlimited

    # Comment settings
    max_comment_length: int = 5000
    allow_comment_threading: bool = True
    enable_mentions: bool = True

    # Notifications
    notify_on_invite: bool = True
    notify_on_mention: bool = True
    notify_on_role_change: bool = True

    # Hooks for customization (callable functions)
    permission_checker: Optional[Callable] = None
    post_invite_hook: Optional[Callable] = None
    post_comment_hook: Optional[Callable] = None

    class Config:
        arbitrary_types_allowed = True


# Default configuration for SkyBuild Pro
SKYBUILD_COLLABORATION_CONFIG = CollaborationConfig(
    context_types=["project", "boq", "task"],
    available_roles=["owner", "editor", "viewer"],
    enable_comments=True,
    enable_invitations=True,
    enable_activity_log=True,
    enable_version_history=True,
    max_collaborators_per_resource=50,  # Reasonable limit
)
