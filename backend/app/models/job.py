from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    file_id = Column(String, ForeignKey("files.id"), nullable=False, index=True)
    status = Column(String, default="queued", index=True)  # queued|running|completed|failed|canceled
    progress = Column(Integer, default=0)
    error_code = Column(String, nullable=True)
    price_list_id = Column(String, ForeignKey("price_lists.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
