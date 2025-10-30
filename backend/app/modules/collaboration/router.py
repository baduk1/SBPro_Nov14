"""
Collaboration Module - API Router

Pluggable FastAPI router for collaboration features.
Can be mounted in any FastAPI application.
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project

from app.modules.collaboration.schemas import (
    CollaboratorResponse,
    CollaboratorCreate,
    CollaboratorUpdate,
    InvitationCreate,
    InvitationResponse,
    InvitationAccept,
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    ActivityResponse,
    ActivityQuery,
    NotificationResponse,
    NotificationMarkRead
)
from app.modules.collaboration.service import CollaborationService
from app.modules.collaboration.permissions import PermissionChecker
from app.modules.collaboration.config import CollaborationConfig, SKYBUILD_COLLABORATION_CONFIG


def create_collaboration_router(
    config: CollaborationConfig = SKYBUILD_COLLABORATION_CONFIG
) -> APIRouter:
    """
    Factory function to create a collaboration router with custom configuration.

    This makes the router reusable across different projects.
    """
    router = APIRouter(tags=["collaboration"])
    service = CollaborationService(config)
    permissions = PermissionChecker(config)

    # ==================== Collaborators ====================

    @router.get("/projects/{project_id}/collaborators", response_model=List[CollaboratorResponse])
    def list_collaborators(
        project_id: str,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        List all collaborators for a project.

        Requires: viewer role or higher
        """
        # Check permissions
        project, user_role = permissions.require_project_access(
            project_id, "viewer", db, current_user
        )

        # Get collaborators
        collaborators = service.get_project_collaborators(db, project_id)

        # Enrich with user details
        result = []
        for collab in collaborators:
            user = db.query(User).filter(User.id == collab.user_id).first()
            result.append({
                "id": collab.id,
                "project_id": collab.project_id,
                "role": collab.role,
                "invited_at": collab.invited_at,
                "accepted_at": collab.accepted_at,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name
                } if user else None
            })

        return result

    @router.post("/projects/{project_id}/collaborators", response_model=CollaboratorResponse, status_code=status.HTTP_201_CREATED)
    def add_collaborator(
        project_id: str,
        data: CollaboratorCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Add a user as a collaborator (direct add, no invitation).

        Requires: owner role
        """
        # Check permissions
        project, user_role = permissions.require_project_access(
            project_id, "owner", db, current_user
        )

        try:
            collaborator = service.add_collaborator(
                db, project_id, data.user_id, data.role, current_user.id
            )

            # Get user details
            user = db.query(User).filter(User.id == collaborator.user_id).first()

            # Log activity
            service.log_activity(
                db, project_id, current_user.id, "member.added",
                {"user_id": data.user_id, "role": data.role}
            )

            return {
                "id": collaborator.id,
                "project_id": collaborator.project_id,
                "role": collaborator.role,
                "invited_at": collaborator.invited_at,
                "accepted_at": collaborator.accepted_at,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name
                } if user else None
            }

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @router.patch("/projects/{project_id}/collaborators/{collaborator_id}", response_model=CollaboratorResponse)
    def update_collaborator(
        project_id: str,
        collaborator_id: int,
        data: CollaboratorUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Update a collaborator's role.

        Requires: owner role
        """
        # Check permissions
        project, user_role = permissions.require_project_access(
            project_id, "owner", db, current_user
        )

        try:
            collaborator = service.update_collaborator_role(db, collaborator_id, data.role)

            # Get user details
            user = db.query(User).filter(User.id == collaborator.user_id).first()

            # Log activity
            service.log_activity(
                db, project_id, current_user.id, "member.role_changed",
                {"collaborator_id": collaborator_id, "new_role": data.role}
            )

            return {
                "id": collaborator.id,
                "project_id": collaborator.project_id,
                "role": collaborator.role,
                "invited_at": collaborator.invited_at,
                "accepted_at": collaborator.accepted_at,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name
                } if user else None
            }

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @router.delete("/projects/{project_id}/collaborators/{collaborator_id}", status_code=status.HTTP_204_NO_CONTENT)
    def remove_collaborator(
        project_id: str,
        collaborator_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Remove a collaborator from the project.

        Requires: owner role
        """
        # Check permissions
        project, user_role = permissions.require_project_access(
            project_id, "owner", db, current_user
        )

        success = service.remove_collaborator(db, collaborator_id)

        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaborator not found")

        # Log activity
        service.log_activity(
            db, project_id, current_user.id, "member.removed",
            {"collaborator_id": collaborator_id}
        )

        return None

    # ==================== Invitations ====================

    @router.post("/projects/{project_id}/invite", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
    def invite_collaborator(
        project_id: str,
        data: InvitationCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Invite a user to collaborate via email.

        Requires: editor role or higher
        """
        # Check permissions
        project, user_role = permissions.require_project_access(
            project_id, "editor", db, current_user
        )

        # Only owners can invite as owner
        if data.role == "owner" and user_role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owners can invite other owners"
            )

        try:
            invitation, token = service.create_invitation(
                db, project_id, data.email, data.role,
                current_user.id, data.expires_in_days
            )

            # TODO: Send email with invitation link containing token
            # For now, return the token in response (in production, send via email)

            # Log activity
            service.log_activity(
                db, project_id, current_user.id, "member.invited",
                {"email": data.email, "role": data.role}
            )

            return {
                **invitation.__dict__,
                "_token": token  # TEMPORARY: should be sent via email only
            }

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @router.post("/join-project", response_model=dict)
    def accept_invitation(
        data: InvitationAccept,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Accept a project invitation using the token from email.
        """
        try:
            collaborator = service.accept_invitation(db, data.token, current_user.id)

            # Log activity
            service.log_activity(
                db, collaborator.project_id, current_user.id, "member.joined",
                {"role": collaborator.role}
            )

            return {
                "success": True,
                "project_id": collaborator.project_id,
                "role": collaborator.role
            }

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # ==================== Comments ====================

    @router.get("/projects/{project_id}/comments", response_model=List[CommentResponse])
    def list_comments(
        project_id: str,
        context_type: Optional[str] = Query(None),
        context_id: Optional[str] = Query(None),
        limit: int = Query(50, ge=1, le=200),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        List comments for a project or specific context.

        Requires: viewer role or higher
        """
        # Check permissions
        project, user_role = permissions.require_project_access(
            project_id, "viewer", db, current_user
        )

        comments = service.get_comments(db, project_id, context_type, context_id, limit)

        # Enrich with author details
        result = []
        for comment in comments:
            author = db.query(User).filter(User.id == comment.author_id).first()
            result.append({
                "id": comment.id,
                "project_id": comment.project_id,
                "context_type": comment.context_type,
                "context_id": comment.context_id,
                "body": comment.body,
                "author_id": comment.author_id,
                "parent_id": comment.parent_id,
                "created_at": comment.created_at,
                "updated_at": comment.updated_at,
                "author": {
                    "id": author.id,
                    "email": author.email,
                    "full_name": author.full_name
                } if author else None
            })

        return result

    @router.post("/projects/{project_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
    def create_comment(
        project_id: str,
        data: CommentCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Create a new comment.

        Requires: viewer role or higher (configurable)
        """
        # Check permissions
        project, user_role = permissions.require_project_access(
            project_id, "viewer", db, current_user
        )

        try:
            comment = service.create_comment(db, project_id, data, current_user.id)

            # Get author details
            author = db.query(User).filter(User.id == comment.author_id).first()

            # Log activity
            service.log_activity(
                db, project_id, current_user.id, "comment.created",
                {
                    "comment_id": comment.id,
                    "context_type": data.context_type,
                    "context_id": data.context_id
                }
            )

            return {
                "id": comment.id,
                "project_id": comment.project_id,
                "context_type": comment.context_type,
                "context_id": comment.context_id,
                "body": comment.body,
                "author_id": comment.author_id,
                "parent_id": comment.parent_id,
                "created_at": comment.created_at,
                "updated_at": comment.updated_at,
                "author": {
                    "id": author.id,
                    "email": author.email,
                    "full_name": author.full_name
                } if author else None
            }

        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # ==================== Activities ====================

    @router.get("/projects/{project_id}/activities", response_model=List[ActivityResponse])
    def list_activities(
        project_id: str,
        since: Optional[str] = Query(None),
        activity_type: Optional[str] = Query(None),
        limit: int = Query(50, ge=1, le=200),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        List activity log for a project.

        Requires: viewer role or higher
        """
        # Check permissions
        project, user_role = permissions.require_project_access(
            project_id, "viewer", db, current_user
        )

        activities = service.get_activities(db, project_id, None, activity_type, limit)

        # Enrich with actor details
        result = []
        for activity in activities:
            actor = db.query(User).filter(User.id == activity.actor_id).first()
            result.append({
                "id": activity.id,
                "project_id": activity.project_id,
                "actor_id": activity.actor_id,
                "type": activity.type,
                "payload": json.loads(activity.payload),
                "created_at": activity.created_at,
                "actor": {
                    "id": actor.id,
                    "email": actor.email,
                    "full_name": actor.full_name
                } if actor else None
            })

        return result

    # ==================== Notifications ====================

    @router.get("/notifications", response_model=List[NotificationResponse])
    def list_notifications(
        unread_only: bool = Query(False),
        limit: int = Query(50, ge=1, le=200),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        List notifications for the current user.
        """
        notifications = service.get_notifications(db, current_user.id, unread_only, limit)

        result = []
        for notif in notifications:
            result.append({
                "id": notif.id,
                "user_id": notif.user_id,
                "project_id": notif.project_id,
                "type": notif.type,
                "payload": json.loads(notif.payload),
                "created_at": notif.created_at,
                "read_at": notif.read_at
            })

        return result

    @router.post("/notifications/mark-read", response_model=dict)
    def mark_notifications_read(
        data: NotificationMarkRead,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
    ):
        """
        Mark notifications as read.
        """
        count = service.mark_notifications_read(db, current_user.id, data.notification_ids)

        return {"marked_read": count}

    return router


# Default router instance for SkyBuild Pro
collaboration_router = create_collaboration_router(SKYBUILD_COLLABORATION_CONFIG)
