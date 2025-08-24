from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class Artifact(Base):
    __tablename__ = "artifacts"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), index=True, nullable=False)
    kind = Column(String, nullable=False)  # export:csv|xlsx|pdf
    path = Column(String, nullable=False)
    size = Column(Integer, default=0)
    checksum = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
