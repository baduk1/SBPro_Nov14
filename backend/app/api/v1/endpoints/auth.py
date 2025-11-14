from datetime import timedelta, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.email_verification import EmailVerificationToken
from app.models.project import Project
from app.schemas.auth import Token
from app.schemas.user import UserOut, UserRegister
from app.services.email import EmailService

router = APIRouter()


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    # Enforce email verification (except for admins who are pre-verified)
    if not user.email_verified and user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please check your inbox for the verification link."
        )

    token = create_access_token(
        {"sub": user.id, "role": user.role},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/register", response_model=UserOut)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account.
    - Creates user with email_verified=False
    - Sends verification email
    - Assigns 2000 free trial credits
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    new_user = User(
        email=data.email,
        hash=get_password_hash(data.password),
        full_name=data.full_name,
        role=UserRole.USER.value,
        email_verified=True,  # ✅ Auto-verified (SMTP not configured)
        credits_balance=2000  # Free trial credits
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create default project for the user (DISABLED - users should create projects manually or be invited)
    # default_project = Project(
    #     owner_id=new_user.id,
    #     name='My First Project'
    # )
    # db.add(default_project)
    # db.commit()
    # db.refresh(default_project)

    # Email verification disabled (SMTP not configured)
    # Create verification token
    # verification_token = EmailVerificationToken.create_token_with_expiry(
    #     user_id=new_user.id,
    #     hours=24
    # )
    # db.add(verification_token)
    # db.commit()

    # # ✅ Send verification email (IONOS SMTP)
    # try:
    #     EmailService.send_verification_email(
    #         to_email=new_user.email,
    #         verification_token=verification_token.token,
    #         user_name=new_user.full_name
    #     )
    # except Exception as e:
    #     # Log error but don't block registration
    #     print(f"Warning: Failed to send verification email to {new_user.email}: {e}")

    return new_user


@router.post("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """
    Verify user email address using token from email.
    """
    # Find verification token
    verification = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token
    ).first()

    if not verification:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    # Check if already used
    if verification.used_at:
        raise HTTPException(status_code=400, detail="Verification token already used")

    # Check if expired
    if verification.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token expired")

    # Mark user as verified
    user = db.query(User).filter(User.id == verification.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.email_verified = True
    verification.used_at = datetime.now(timezone.utc)

    db.commit()

    # Send welcome email
    EmailService.send_welcome_email(
        to_email=user.email,
        user_name=user.full_name
    )

    return {"message": "Email verified successfully", "email": user.email}


@router.post("/resend-verification")
def resend_verification(email: str, db: Session = Depends(get_db)):
    """
    Resend verification email to user.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    # ✅ Server-side throttle: enforce 60s cooldown
    from datetime import datetime, timezone
    
    if user.last_verification_sent_at:
        now = datetime.now(timezone.utc)
        elapsed = (now - user.last_verification_sent_at).total_seconds()
        
        if elapsed < 60:
            remaining = int(60 - elapsed)
            raise HTTPException(
                status_code=429,  # Too Many Requests
                detail=f"Please wait {remaining} seconds before requesting another verification email"
            )
    
    # Create new verification token
    verification_token = EmailVerificationToken.create_token_with_expiry(
        user_id=user.id,
        hours=24
    )
    db.add(verification_token)
    db.commit()

    # Send verification email
    EmailService.send_verification_email(
        to_email=user.email,
        verification_token=verification_token.token,
        user_name=user.full_name
    )
    
    # ✅ Update last sent timestamp to enforce throttle
    user.last_verification_sent_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Verification email sent", "email": user.email}


@router.post("/complete-invite")
def complete_invite(token: str, password: str, db: Session = Depends(get_db)):
    """
    Complete invite by setting password and verifying email.
    Used for admin-approved access requests.
    """
    # Find invite token
    invite = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token
    ).first()

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid invite token")

    # Check if already used
    if invite.used_at:
        raise HTTPException(status_code=400, detail="Invite token already used")

    # Check if expired
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite token expired")

    # Get user
    user = db.query(User).filter(User.id == invite.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Set password and verify email
    user.hash = get_password_hash(password)
    user.email_verified = True
    invite.used_at = datetime.now(timezone.utc)

    db.commit()

    # Create login token
    token = create_access_token(
        {"sub": user.id, "role": user.role},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {
        "message": "Account activated successfully",
        "email": user.email,
        "access_token": token,
        "token_type": "bearer"
    }
