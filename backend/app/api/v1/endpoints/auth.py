from datetime import timedelta, datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash, get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.email_verification import EmailVerificationToken
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
        email_verified=False,
        credits_balance=2000  # Free trial credits
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create verification token
    verification_token = EmailVerificationToken.create_token_with_expiry(
        user_id=new_user.id,
        hours=24
    )
    db.add(verification_token)
    db.commit()

    # Send verification email
    EmailService.send_verification_email(
        to_email=new_user.email,
        verification_token=verification_token.token,
        user_name=new_user.full_name
    )

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
    if verification.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification token expired")

    # Mark user as verified
    user = db.query(User).filter(User.id == verification.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.email_verified = True
    verification.used_at = datetime.utcnow()

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

    return {"message": "Verification email sent", "email": user.email}
