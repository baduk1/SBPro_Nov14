"""
Collaboration Module - RBAC Permissions System

Reusable role-based access control for collaboration features.
"""
from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.modules.collaboration.models import ProjectCollaborator
from app.modules.collaboration.config import CollaborationConfig, SKYBUILD_COLLABORATION_CONFIG


class PermissionDenied(HTTPException):
    """Custom exception for permission denials"""
    def __init__(self, detail: str = "Permission denied", role: Optional[str] = None, required: Optional[str] = None):
        message = detail
        if role and required:
            message = f"{detail}. Your role: {role}, required: {required}"
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=message)


class ResourceNotFound(HTTPException):
    """Custom exception for resource not found"""
    def __init__(self, resource_type: str = "Resource", resource_id: str = ""):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_type} not found" + (f": {resource_id}" if resource_id else "")
        )


class PermissionChecker:
    """
    Reusable permission checker for collaboration features.

    Can be used as FastAPI dependency or standalone.
    """

    def __init__(self, config: CollaborationConfig = SKYBUILD_COLLABORATION_CONFIG):
        self.config = config
        self.role_hierarchy = config.role_hierarchy

    def check_role_level(self, user_role: str, required_role: str) -> bool:
        """
        Check if user's role meets the required level.

        Returns True if user_role >= required_role in hierarchy.
        """
        user_level = self.role_hierarchy.get(user_role, 0)
        required_level = self.role_hierarchy.get(required_role, 0)
        return user_level >= required_level

    def get_user_role(
        self,
        db: Session,
        project_id: str,
        user_id: str
    ) -> Optional[str]:
        """Get user's role in a project, or None if not a collaborator."""
        collab = db.query(ProjectCollaborator).filter(
            ProjectCollaborator.project_id == project_id,
            ProjectCollaborator.user_id == user_id
        ).first()

        return collab.role if collab else None

    def require_project_access(
        self,
        project_id: str,
        min_role: str = "viewer",
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ) -> Tuple[Project, str]:
        """
        FastAPI dependency to require project access with minimum role.

        Returns: (project, user_role)
        Raises: HTTPException if access denied
        """
        # Check if project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ResourceNotFound(resource_type="Project", resource_id=project_id)

        # Get user's role in project
        user_role = self.get_user_role(db, project_id, current_user.id)

        if not user_role:
            raise PermissionDenied(
                detail="You are not a collaborator on this project",
                role=None,
                required=min_role
            )

        # Check if role meets minimum requirement
        if not self.check_role_level(user_role, min_role):
            raise PermissionDenied(
                detail="Insufficient permissions",
                role=user_role,
                required=min_role
            )

        return project, user_role

    def can_invite(self, user_role: str) -> bool:
        """Check if user can invite others (editor or owner)"""
        return self.check_role_level(user_role, "editor")

    def can_change_roles(self, user_role: str) -> bool:
        """Check if user can change other users' roles (owner only)"""
        return user_role == "owner"

    def can_remove_collaborator(self, user_role: str) -> bool:
        """Check if user can remove collaborators (owner only)"""
        return user_role == "owner"

    def can_comment(self, user_role: str) -> bool:
        """Check if user can comment (viewer or higher)"""
        return self.check_role_level(user_role, "viewer")

    def can_edit(self, user_role: str) -> bool:
        """Check if user can edit resources (editor or higher)"""
        return self.check_role_level(user_role, "editor")


# Global instance for SkyBuild configuration
permission_checker = PermissionChecker(SKYBUILD_COLLABORATION_CONFIG)


# Convenience dependency factories
def require_viewer(project_id: str):
    """Require viewer role or higher"""
    def dependency(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ) -> Tuple[Project, str]:
        return permission_checker.require_project_access(project_id, "viewer", db, current_user)
    return Depends(dependency)


def require_editor(project_id: str):
    """Require editor role or higher"""
    def dependency(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ) -> Tuple[Project, str]:
        return permission_checker.require_project_access(project_id, "editor", db, current_user)
    return Depends(dependency)


def require_owner(project_id: str):
    """Require owner role"""
    def dependency(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ) -> Tuple[Project, str]:
        return permission_checker.require_project_access(project_id, "owner", db, current_user)
    return Depends(dependency)
