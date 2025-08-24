from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    owner_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
