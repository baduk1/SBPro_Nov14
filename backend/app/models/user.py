from enum import Enum

from sqlalchemy import Column, String, DateTime, Integer, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default=UserRole.USER.value)
    hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Registration & Credits
    email_verified = Column(Boolean, default=False, nullable=False)
    credits_balance = Column(Integer, default=2000, nullable=False)  # Free trial: 2000 credits
    full_name = Column(String, nullable=True)
    last_verification_sent_at = Column(DateTime(timezone=True), nullable=True)  # For throttling resend

    # Relationships
    suppliers = relationship("Supplier", back_populates="user")
    templates = relationship("Template", backref="user")
    estimates = relationship("Estimate", backref="user")
