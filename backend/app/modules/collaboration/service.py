"""
Collaboration Module - Business Logic Service

Reusable service layer for collaboration features.
"""
import asyncio
import hashlib
import secrets
import json
from typing import List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.modules.collaboration.models import (
    ProjectCollaborator,
    ProjectInvitation,
    Comment,
    Activity,
    Notification
)
from app.modules.collaboration.schemas import (
    CollaboratorCreate,
    InvitationCreate,
    CommentCreate,
    CommentUpdate
)
from app.modules.collaboration.config import CollaborationConfig, SKYBUILD_COLLABORATION_CONFIG
from app.models.user import User
from app.models.project import Project
from app.services.email import EmailService
from app.services.sse import broker


class CollaborationService:
    """
    Service layer for collaboration features.

    Handles business logic, validation, and database operations.
    """

    def __init__(self, config: CollaborationConfig = SKYBUILD_COLLABORATION_CONFIG):
        self.config = config

    # ==================== Collaborators ====================

    def get_project_collaborators(
        self,
        db: Session,
        project_id: str
    ) -> List[ProjectCollaborator]:
        """Get all collaborators for a project."""
        return db.query(ProjectCollaborator).filter(
            ProjectCollaborator.project_id == project_id
        ).all()

    def add_collaborator(
        self,
        db: Session,
        project_id: str,
        user_id: str,
        role: str,
        invited_by_id: str
    ) -> ProjectCollaborator:
        """
        Add a new collaborator to a project.

        Raises ValueError if user is already a collaborator or invalid role.
        """
        # Validate role
        if role not in self.config.available_roles:
            raise ValueError(f"Invalid role: {role}. Must be one of {self.config.available_roles}")

        # Check if already a collaborator
        existing = db.query(ProjectCollaborator).filter(
            ProjectCollaborator.project_id == project_id,
            ProjectCollaborator.user_id == user_id
        ).first()

        if existing:
            raise ValueError(f"User {user_id} is already a collaborator")

        # Check max collaborators limit
        if self.config.max_collaborators_per_resource:
            count = db.query(ProjectCollaborator).filter(
                ProjectCollaborator.project_id == project_id
            ).count()
            if count >= self.config.max_collaborators_per_resource:
                raise ValueError(f"Maximum collaborators limit reached ({self.config.max_collaborators_per_resource})")

        # Create collaborator
        collaborator = ProjectCollaborator(
            project_id=project_id,
            user_id=user_id,
            role=role,
            invited_by=invited_by_id,
            accepted_at=datetime.now(timezone.utc)  # Direct add = auto-accepted
        )

        db.add(collaborator)
        db.commit()
        db.refresh(collaborator)

        return collaborator

    def update_collaborator_role(
        self,
        db: Session,
        collaborator_id: int,
        new_role: str
    ) -> ProjectCollaborator:
        """Update a collaborator's role."""
        if new_role not in self.config.available_roles:
            raise ValueError(f"Invalid role: {new_role}")

        collaborator = db.query(ProjectCollaborator).filter(
            ProjectCollaborator.id == collaborator_id
        ).first()

        if not collaborator:
            raise ValueError("Collaborator not found")

        collaborator.role = new_role
        db.commit()
        db.refresh(collaborator)

        return collaborator

    def remove_collaborator(
        self,
        db: Session,
        collaborator_id: int
    ) -> bool:
        """Remove a collaborator from a project."""
        collaborator = db.query(ProjectCollaborator).filter(
            ProjectCollaborator.id == collaborator_id
        ).first()

        if not collaborator:
            return False

        db.delete(collaborator)
        db.commit()
        return True

    # ==================== Invitations ====================

    def create_invitation(
        self,
        db: Session,
        project_id: str,
        email: str,
        role: str,
        invited_by_id: str,
        expires_in_days: int = 7
    ) -> Tuple[ProjectInvitation, str]:
        """
        Create a new project invitation.

        Returns: (invitation, token) - token is only returned once
        """
        if role not in self.config.available_roles:
            raise ValueError(f"Invalid role: {role}")

        if role == "owner":
            raise ValueError("Cannot invite as owner")

        # Generate secure token
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # Check for existing pending invitation
        existing = db.query(ProjectInvitation).filter(
            ProjectInvitation.project_id == project_id,
            ProjectInvitation.email == email.lower(),
            ProjectInvitation.status == 'pending'
        ).first()

        if existing:
            raise ValueError(f"Pending invitation already exists for {email}")

        # Create invitation
        invitation = ProjectInvitation(
            project_id=project_id,
            email=email.lower(),
            role=role,
            token_hash=token_hash,
            invited_by=invited_by_id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=expires_in_days)
        )

        db.add(invitation)
        db.commit()
        db.refresh(invitation)

        # Send invitation email
        # Get project and inviter details for the email
        project = db.query(Project).filter(Project.id == project_id).first()
        inviter = db.query(User).filter(User.id == invited_by_id).first()

        project_name = project.name if project else "Unnamed Project"
        inviter_name = inviter.full_name if (inviter and inviter.full_name) else "A team member"

        # Send email (don't fail if email sending fails)
        try:
            EmailService.send_project_invitation_email(
                to_email=email,
                invitation_token=token,
                project_name=project_name,
                inviter_name=inviter_name,
                role=role,
                recipient_name=None  # We don't know their name yet
            )
        except Exception as e:
            # Log but don't fail - invitation is created even if email fails
            import logging
            logging.error(f"Failed to send invitation email to {email}: {e}")

        # Publish SSE event for real-time updates
        try:
            asyncio.create_task(broker.publish(
                f"project:{project_id}:invitations",
                {
                    "type": "invitation.created",
                    "invitation_id": invitation.id,
                    "email": invitation.email,
                    "role": invitation.role,
                    "status": invitation.status
                }
            ))
        except RuntimeError:
            pass  # No event loop running

        return invitation, token

    def accept_invitation(
        self,
        db: Session,
        token: str,
        user_id: str
    ) -> ProjectCollaborator:
        """
        Accept an invitation using the token.

        Creates a collaborator record and marks invitation as accepted.
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        invitation = db.query(ProjectInvitation).filter(
            ProjectInvitation.token_hash == token_hash,
            ProjectInvitation.status == 'pending'
        ).first()

        if not invitation:
            raise ValueError("Invalid or expired invitation")

        # Check expiration
        if invitation.expires_at and invitation.expires_at < datetime.now(timezone.utc):
            invitation.status = 'expired'
            db.commit()
            raise ValueError("Invitation has expired")

        # Check if user is already a collaborator
        existing = db.query(ProjectCollaborator).filter(
            ProjectCollaborator.project_id == invitation.project_id,
            ProjectCollaborator.user_id == user_id
        ).first()

        if existing:
            invitation.status = 'accepted'
            db.commit()
            return existing

        # Create collaborator
        collaborator = ProjectCollaborator(
            project_id=invitation.project_id,
            user_id=user_id,
            role=invitation.role,
            invited_by=invitation.invited_by,
            accepted_at=datetime.now(timezone.utc)
        )

        invitation.status = 'accepted'

        db.add(collaborator)
        db.commit()
        db.refresh(collaborator)

        # Publish SSE event for real-time updates
        try:
            asyncio.create_task(broker.publish(
                f"project:{invitation.project_id}:invitations",
                {
                    "type": "invitation.accepted",
                    "invitation_id": invitation.id,
                    "email": invitation.email,
                    "status": "accepted"
                }
            ))
        except RuntimeError:
            pass  # No event loop running

        return collaborator

    def get_project_invitations(
        self,
        db: Session,
        project_id: str,
        status: str = 'pending'
    ) -> List[ProjectInvitation]:
        """Get all invitations for a project filtered by status."""
        return db.query(ProjectInvitation).filter(
            ProjectInvitation.project_id == project_id,
            ProjectInvitation.status == status
        ).all()

    def revoke_invitation(
        self,
        db: Session,
        invitation_id: int
    ) -> bool:
        """Revoke a pending invitation."""
        invitation = db.query(ProjectInvitation).filter(
            ProjectInvitation.id == invitation_id,
            ProjectInvitation.status == 'pending'
        ).first()

        if not invitation:
            return False

        project_id = invitation.project_id
        invitation_email = invitation.email

        invitation.status = 'revoked'
        db.commit()

        # Publish SSE event for real-time updates
        try:
            asyncio.create_task(broker.publish(
                f"project:{project_id}:invitations",
                {
                    "type": "invitation.revoked",
                    "invitation_id": invitation_id,
                    "email": invitation_email,
                    "status": "revoked"
                }
            ))
        except RuntimeError:
            pass  # No event loop running

        return True

    def resend_invitation(
        self,
        db: Session,
        invitation_id: int
    ) -> Tuple[ProjectInvitation, str]:
        """
        Resend an invitation email with a new token.

        Returns: (invitation, new_token)
        """
        invitation = db.query(ProjectInvitation).filter(
            ProjectInvitation.id == invitation_id,
            ProjectInvitation.status == 'pending'
        ).first()

        if not invitation:
            raise ValueError("Invitation not found or already processed")

        # Check if expired
        if invitation.expires_at and invitation.expires_at < datetime.now(timezone.utc):
            raise ValueError("Invitation has expired - create a new one")

        # Generate new secure token
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # Update invitation with new token
        invitation.token_hash = token_hash
        db.commit()
        db.refresh(invitation)

        # Send invitation email
        project = db.query(Project).filter(Project.id == invitation.project_id).first()
        inviter = db.query(User).filter(User.id == invitation.invited_by).first()

        project_name = project.name if project else "Unnamed Project"
        inviter_name = inviter.full_name if (inviter and inviter.full_name) else "A team member"

        # Send email (don't fail if email sending fails)
        try:
            EmailService.send_project_invitation_email(
                to_email=invitation.email,
                invitation_token=token,
                project_name=project_name,
                inviter_name=inviter_name,
                role=invitation.role,
                recipient_name=None
            )
        except Exception as e:
            import logging
            logging.error(f"Failed to resend invitation email to {invitation.email}: {e}")

        # Publish SSE event for real-time updates
        try:
            asyncio.create_task(broker.publish(
                f"project:{invitation.project_id}:invitations",
                {
                    "type": "invitation.resent",
                    "invitation_id": invitation.id,
                    "email": invitation.email,
                    "status": invitation.status
                }
            ))
        except RuntimeError:
            pass  # No event loop running

        return invitation, token

    # ==================== Comments ====================

    def create_comment(
        self,
        db: Session,
        project_id: str,
        data: CommentCreate,
        author_id: str
    ) -> Comment:
        """Create a new comment."""
        # Validate context type
        if data.context_type not in self.config.context_types:
            raise ValueError(f"Invalid context_type: {data.context_type}")

        # Validate comment length
        if len(data.body) > self.config.max_comment_length:
            raise ValueError(f"Comment too long (max {self.config.max_comment_length} chars)")

        comment = Comment(
            project_id=project_id,
            context_type=data.context_type,
            context_id=data.context_id,
            author_id=author_id,
            body=data.body,
            parent_id=data.parent_id
        )

        db.add(comment)
        db.commit()
        db.refresh(comment)

        return comment

    def update_comment(
        self,
        db: Session,
        comment_id: int,
        data: CommentUpdate,
        user_id: str
    ) -> Comment:
        """Update an existing comment (author only)."""
        comment = db.query(Comment).filter(Comment.id == comment_id).first()

        if not comment:
            raise ValueError("Comment not found")

        if comment.author_id != user_id:
            raise ValueError("Only comment author can edit")

        comment.body = data.body
        comment.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(comment)

        return comment

    def delete_comment(
        self,
        db: Session,
        comment_id: int,
        user_id: str
    ) -> bool:
        """Delete a comment (author only)."""
        comment = db.query(Comment).filter(Comment.id == comment_id).first()

        if not comment:
            return False

        if comment.author_id != user_id:
            raise ValueError("Only comment author can delete")

        db.delete(comment)
        db.commit()
        return True

    def get_comments(
        self,
        db: Session,
        project_id: str,
        context_type: Optional[str] = None,
        context_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Comment]:
        """Get comments for a project or specific context."""
        query = db.query(Comment).filter(Comment.project_id == project_id)

        if context_type:
            query = query.filter(Comment.context_type == context_type)

        if context_id:
            query = query.filter(Comment.context_id == context_id)

        return query.order_by(Comment.created_at.desc()).limit(limit).all()

    # ==================== Activity Log ====================

    def log_activity(
        self,
        db: Session,
        project_id: str,
        actor_id: str,
        activity_type: str,
        payload: dict
    ) -> Activity:
        """Log an activity event."""
        activity = Activity(
            project_id=project_id,
            actor_id=actor_id,
            type=activity_type,
            payload=json.dumps(payload)
        )

        db.add(activity)
        db.commit()
        db.refresh(activity)

        return activity

    def get_activities(
        self,
        db: Session,
        project_id: str,
        since: Optional[datetime] = None,
        activity_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Activity]:
        """Get activity log for a project."""
        query = db.query(Activity).filter(Activity.project_id == project_id)

        if since:
            query = query.filter(Activity.created_at >= since)

        if activity_type:
            query = query.filter(Activity.type == activity_type)

        return query.order_by(Activity.created_at.desc()).limit(limit).all()

    # ==================== Notifications ====================

    def create_notification(
        self,
        db: Session,
        user_id: str,
        notification_type: str,
        payload: dict,
        project_id: Optional[str] = None
    ) -> Notification:
        """Create a notification for a user."""
        notification = Notification(
            user_id=user_id,
            project_id=project_id,
            type=notification_type,
            payload=json.dumps(payload)
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        return notification

    def mark_notifications_read(
        self,
        db: Session,
        user_id: str,
        notification_ids: List[int]
    ) -> int:
        """Mark notifications as read. Returns count of updated notifications."""
        count = db.query(Notification).filter(
            Notification.id.in_(notification_ids),
            Notification.user_id == user_id,
            Notification.read_at.is_(None)
        ).update(
            {Notification.read_at: datetime.now(timezone.utc)},
            synchronize_session=False
        )

        db.commit()
        return count

    def get_notifications(
        self,
        db: Session,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a user."""
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.read_at.is_(None))

        return query.order_by(Notification.created_at.desc()).limit(limit).all()


# Global service instance
collaboration_service = CollaborationService()
