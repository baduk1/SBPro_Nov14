from sqlalchemy import Column, String, ForeignKey, Float
from uuid import uuid4

from app.models.base import Base


class BoqItem(Base):
    __tablename__ = "boq_items"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    job_id = Column(String, ForeignKey("jobs.id"), index=True, nullable=False)
    code = Column(String, index=True, nullable=True)
    description = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    qty = Column(Float, default=0.0)
    source_ref = Column(String, nullable=True)
    mapped_price_item_id = Column(String, ForeignKey("price_items.id"), nullable=True)
    allowance_amount = Column(Float, default=0.0)
    unit_price = Column(Float, default=0.0)  # Price per unit
    total_price = Column(Float, default=0.0)  # qty * unit_price
