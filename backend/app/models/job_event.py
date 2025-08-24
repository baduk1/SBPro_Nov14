from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class JobEvent(Base):
    __tablename__ = "job_events"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), index=True, nullable=False)
    ts = Column(DateTime(timezone=True), server_default=func.now())
    stage = Column(String, nullable=False)
    message = Column(String, nullable=False)
    details = Column(Text, nullable=True)
