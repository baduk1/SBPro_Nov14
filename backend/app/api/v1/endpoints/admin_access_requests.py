from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.access_request import AccessRequest
from app.models.user import User, UserRole
from app.models.email_verification import EmailVerificationToken
from app.models.project import Project
from app.schemas.access_request import AccessRequestOut, AccessRequestUpdate
from app.services.email import EmailService


router = APIRouter(
    prefix="/access-requests",
    tags=["Admin: Access Requests"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=List[AccessRequestOut])
def list_access_requests(db: Session = Depends(get_db)):
    return db.query(AccessRequest).order_by(AccessRequest.created_at.desc()).all()


@router.patch("/{request_id}", response_model=AccessRequestOut)
def update_access_request(request_id: str, payload: AccessRequestUpdate, db: Session = Depends(get_db)):
    ar = db.query(AccessRequest).get(request_id)
    if not ar:
        raise HTTPException(status_code=404, detail="Access request not found")

    if payload.status is not None:
        ar.status = payload.status

    db.commit()
    db.refresh(ar)
    return ar


@router.post("/{request_id}/approve")
def approve_access_request(request_id: str, db: Session = Depends(get_db)):
    """
    Approve access request and send invite email (IDEMPOTENT).
    - If user exists & verified → 409
    - If user exists & NOT verified → re-issue invite token
    - Else create user without password, send invite with set-password link
    """
    ar = db.query(AccessRequest).get(request_id)
    if not ar:
        raise HTTPException(status_code=404, detail="Access request not found")
    
    if ar.status == "approved":
        raise HTTPException(status_code=409, detail="Access request already approved")
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == ar.email).first()
    
    if existing_user:
        if existing_user.email_verified:
            # User already verified - cannot re-invite
            raise HTTPException(
                status_code=409, 
                detail="User already exists and is verified. They can log in directly."
            )
        
        # User exists but not verified - re-issue invite token
        user = existing_user
        
        # Invalidate old tokens
        old_tokens = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.used_at == None
        ).all()
        for token in old_tokens:
            token.used_at = datetime.utcnow()
    else:
        # Create new user WITHOUT password (will be set via invite)
        user = User(
            email=ar.email,
            hash="",  # No password yet - will be set via complete-invite
            full_name=ar.name,
            role=UserRole.USER.value,
            email_verified=False,
            credits_balance=2000  # Free trial credits
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create default project
        default_project = Project(
            owner_id=user.id,
            name='My First Project'
        )
        db.add(default_project)
    
    # Create invite token (expires in 7 days for invites)
    invite_token = EmailVerificationToken.create_token_with_expiry(
        user_id=user.id,
        hours=24 * 7  # 7 days for invite
    )
    db.add(invite_token)
    
    # Update access request status
    ar.status = "approved"
    
    db.commit()
    db.refresh(ar)
    
    # Send invite email with set-password link
    try:
        EmailService.send_invite_email(
            to_email=user.email,
            verification_token=invite_token.token,
            user_name=user.full_name
        )
    except Exception as e:
        # Email failed but user created - log and continue
        print(f"Warning: Failed to send invite email to {user.email}: {e}")
    
    return {
        "message": "Access request approved and invite sent",
        "email": user.email,
        "user_id": user.id
    }
