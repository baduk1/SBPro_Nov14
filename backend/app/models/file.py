from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class File(Base):
    __tablename__ = "files"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "IFC" | "DWG"
    ifc_version = Column(String, nullable=True)
    size = Column(Integer, default=0)
    checksum = Column(String, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
