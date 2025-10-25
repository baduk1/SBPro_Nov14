from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.models.base import Base


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid4()))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

    @staticmethod
    def create_token_with_expiry(user_id: str, hours: int = 24):
        """Helper to create a token that expires in N hours"""
        return EmailVerificationToken(
            user_id=user_id,
            expires_at=datetime.utcnow() + timedelta(hours=hours)
        )
