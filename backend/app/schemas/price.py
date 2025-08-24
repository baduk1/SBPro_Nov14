from pydantic import BaseModel, ConfigDict
from typing import Optional


class PriceListCreate(BaseModel):
    version: str
    currency: str = "GBP"
    effective_from: Optional[str] = None
    is_active: bool = False


class PriceListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    version: str
    currency: str
    effective_from: Optional[str]
    is_active: bool


class PriceItemCreate(BaseModel):
    code: str
    description: str
    unit: str
    rate: float


class PriceItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    price_list_id: str
    code: str
    description: str
    unit: str
    rate: float
