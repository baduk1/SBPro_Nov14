from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserOut

router = APIRouter()


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    token = create_access_token({"sub": user.id}, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    return Token(access_token=token)


@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    """
    Convenience endpoint to create the first admin: admin@example.com / admin123
    """
    email = "admin@example.com"
    user = db.query(User).filter(User.email == email).first()
    if user:
        return {"created": False, "email": email}
    u = User(email=email, role="admin", hash=get_password_hash("admin123"))
    db.add(u)
    db.commit()
    return {"created": True, "email": email, "password": "admin123"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(lambda: None), db: Session = Depends(get_db)):
    # For MVP, return the seeded admin if present (no strict guard to simplify demo)
    u = db.query(User).filter(User.email == "admin@example.com").first()
    return u or UserOut(id="n/a", email="guest@example.com", role="guest")  # type: ignore
