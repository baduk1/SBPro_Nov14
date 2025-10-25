from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


# ===== Cost Adjustment Schemas =====

class CostAdjustmentBase(BaseModel):
    name: str
    adjustment_type: str  # "percentage" or "fixed"
    value: float
    sort_order: float = 0


class CostAdjustmentCreate(CostAdjustmentBase):
    pass


class CostAdjustmentUpdate(BaseModel):
    name: Optional[str] = None
    adjustment_type: Optional[str] = None
    value: Optional[float] = None
    sort_order: Optional[float] = None


class CostAdjustmentOut(CostAdjustmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    estimate_id: str
    amount: float
    created_at: datetime


# ===== Estimate Item Schemas =====

class EstimateItemBase(BaseModel):
    description: str
    element_type: Optional[str] = None
    unit: str
    quantity: float
    unit_price: float
    currency: str = "GBP"
    notes: Optional[str] = None
    sort_order: float = 0


class EstimateItemCreate(EstimateItemBase):
    boq_item_id: Optional[str] = None


class EstimateItemUpdate(BaseModel):
    description: Optional[str] = None
    element_type: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    sort_order: Optional[float] = None


class EstimateItemOut(EstimateItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    estimate_id: str
    boq_item_id: Optional[str] = None
    total_price: float
    created_at: datetime


# ===== Estimate Schemas =====

class EstimateBase(BaseModel):
    name: str
    description: Optional[str] = None
    currency: str = "GBP"
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class EstimateCreate(EstimateBase):
    job_id: Optional[str] = None
    project_id: Optional[str] = None
    items: List[EstimateItemCreate] = []
    adjustments: List[CostAdjustmentCreate] = []


class EstimateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class EstimateOut(EstimateBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    job_id: Optional[str] = None
    project_id: Optional[str] = None
    subtotal: float
    total: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[EstimateItemOut] = []
    adjustments: List[CostAdjustmentOut] = []


class EstimateListOut(BaseModel):
    """Lightweight estimate list without items/adjustments"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    job_id: Optional[str] = None
    project_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    subtotal: float
    total: float
    currency: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    items_count: int = 0
