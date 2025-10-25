from sqlalchemy import Column, String, DateTime, Boolean, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class Template(Base):
    """
    Template for BoQ items that can be reused across projects.
    Users can create templates to standardize their estimating process.
    """
    __tablename__ = "templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)  # e.g., "Residential", "Commercial", "Infrastructure"
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    items = relationship("TemplateItem", back_populates="template", cascade="all, delete-orphan")


class TemplateItem(Base):
    """
    Individual items within a template.
    Defines element types, default units, and optional pricing.
    """
    __tablename__ = "template_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    template_id = Column(String, ForeignKey("templates.id"), nullable=False, index=True)

    # Element mapping
    element_type = Column(String, nullable=False)  # e.g., "Wall", "Slab", "Column"
    description = Column(Text, nullable=True)
    unit = Column(String, nullable=False)  # e.g., "m2", "m3", "m"

    # Optional default pricing
    default_unit_price = Column(Float, nullable=True)
    default_currency = Column(String, nullable=True, default="GBP")

    # Optional multipliers/adjustments
    quantity_multiplier = Column(Float, default=1.0)  # e.g., 1.1 for 10% waste

    # Display order
    sort_order = Column(Float, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    template = relationship("Template", back_populates="items")
