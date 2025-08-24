from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="user")  # "admin" | "user"
    hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
