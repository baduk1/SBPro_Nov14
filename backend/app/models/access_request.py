from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class AccessRequest(Base):
    """
    Public 'request access' submissions for manual onboarding (no Stripe).
    """
    __tablename__ = "access_requests"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    company = Column(String, nullable=True)
    message = Column(String, nullable=True)
    status = Column(String, default="new")  # new|reviewed|approved|rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
