from pydantic import BaseModel, ConfigDict
from typing import Optional


class BoqItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    job_id: str
    code: Optional[str] = None
    description: str
    unit: str
    qty: float
    source_ref: Optional[str] = None
    mapped_price_item_id: Optional[str] = None
    allowance_amount: float = 0.0


class MappingPatchItem(BaseModel):
    id: str
    code: Optional[str] = None
    mapped_price_item_id: Optional[str] = None
    allowance_amount: Optional[float] = None


class MappingPatchRequest(BaseModel):
    items: list[MappingPatchItem]
