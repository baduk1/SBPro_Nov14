from sqlalchemy import Column, String, ForeignKey, Float
from uuid import uuid4

from app.models.base import Base


class PriceItem(Base):
    __tablename__ = "price_items"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    price_list_id = Column(String, ForeignKey("price_lists.id"), index=True, nullable=False)
    code = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    rate = Column(Float, default=0.0)
