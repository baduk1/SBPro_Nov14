from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class PriceList(Base):
    __tablename__ = "price_lists"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    version = Column(String, nullable=False)
    currency = Column(String, default="GBP")
    effective_from = Column(String, nullable=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
