from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4

from app.models.base import Base


class Estimate(Base):
    """
    Cost estimate for a project or job.
    Links to a job and stores calculated costs with adjustments.
    """
    __tablename__ = "estimates"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)  # Optional link to job
    project_id = Column(String, ForeignKey("projects.id"), nullable=True, index=True)

    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Totals (calculated from items + adjustments)
    subtotal = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    currency = Column(String, default="GBP")

    # Metadata
    notes = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)  # ["urgent", "client-xyz"]

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    items = relationship("EstimateItem", back_populates="estimate", cascade="all, delete-orphan")
    adjustments = relationship("CostAdjustment", back_populates="estimate", cascade="all, delete-orphan")


class EstimateItem(Base):
    """
    Individual line item in an estimate.
    Can be linked to BoQ item or manual entry.
    """
    __tablename__ = "estimate_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    estimate_id = Column(String, ForeignKey("estimates.id"), nullable=False, index=True)
    boq_item_id = Column(String, ForeignKey("boq_items.id"), nullable=True, index=True)  # Optional link

    description = Column(Text, nullable=False)
    element_type = Column(String, nullable=True)
    unit = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)  # quantity * unit_price
    currency = Column(String, default="GBP")

    # Metadata
    notes = Column(Text, nullable=True)
    sort_order = Column(Float, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    estimate = relationship("Estimate", back_populates="items")


class CostAdjustment(Base):
    """
    Adjustments to estimate totals (markup, discount, tax, etc.)
    """
    __tablename__ = "cost_adjustments"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    estimate_id = Column(String, ForeignKey("estimates.id"), nullable=False, index=True)

    name = Column(String, nullable=False)  # e.g., "Markup", "Discount", "VAT"
    adjustment_type = Column(String, nullable=False)  # "percentage" or "fixed"
    value = Column(Float, nullable=False)  # e.g., 20.0 for 20% or 1000.0 for £1000
    amount = Column(Float, nullable=False)  # Calculated amount

    sort_order = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    estimate = relationship("Estimate", back_populates="adjustments")
