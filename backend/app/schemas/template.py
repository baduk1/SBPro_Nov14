from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


# ===== Template Item Schemas =====

class TemplateItemBase(BaseModel):
    element_type: str
    description: Optional[str] = None
    unit: str
    default_unit_price: Optional[float] = None
    default_currency: Optional[str] = "GBP"
    quantity_multiplier: float = 1.0
    sort_order: float = 0


class TemplateItemCreate(TemplateItemBase):
    pass


class TemplateItemUpdate(BaseModel):
    element_type: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    default_unit_price: Optional[float] = None
    default_currency: Optional[str] = None
    quantity_multiplier: Optional[float] = None
    sort_order: Optional[float] = None


class TemplateItemOut(TemplateItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    template_id: str
    created_at: datetime


# ===== Template Schemas =====

class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_default: bool = False


class TemplateCreate(TemplateBase):
    items: List[TemplateItemCreate] = []


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_default: Optional[bool] = None


class TemplateOut(TemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[TemplateItemOut] = []


class TemplateListOut(BaseModel):
    """Lightweight template list without items"""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    items_count: int = 0


class ApplyTemplateRequest(BaseModel):
    """Request to apply template to a job"""
    template_id: str
    job_id: str
