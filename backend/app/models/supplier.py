from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4

from app.db.base import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    contact_info = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="suppliers")
    price_items = relationship("SupplierPriceItem", back_populates="supplier", cascade="all, delete-orphan")


class SupplierPriceItem(Base):
    __tablename__ = "supplier_price_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    code = Column(String, nullable=False)
    description = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    price = Column(Float, nullable=False)  # price as decimal (e.g., 10.50 for £10.50)
    currency = Column(String, default="GBP")
    effective_from = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    supplier = relationship("Supplier", back_populates="price_items")
