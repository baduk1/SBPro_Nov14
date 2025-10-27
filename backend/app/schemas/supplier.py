from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ==================== Supplier Schemas ====================

class SupplierBase(BaseModel):
    name: str
    contact_info: Optional[str] = None
    is_default: bool = False


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_info: Optional[str] = None
    is_default: Optional[bool] = None


class SupplierOut(SupplierBase):
    id: str
    user_id: str
    created_at: datetime
    price_items_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ==================== Supplier Price Item Schemas ====================

class SupplierPriceItemBase(BaseModel):
    code: str
    description: str
    unit: str
    price: float  # price as decimal (e.g., 44.80 for £44.80)
    currency: str = "GBP"
    is_active: bool = True
    effective_from: Optional[datetime] = None


class SupplierPriceItemCreate(SupplierPriceItemBase):
    pass


class SupplierPriceItemUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None
    effective_from: Optional[datetime] = None


class SupplierPriceItemOut(SupplierPriceItemBase):
    id: str
    supplier_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Bulk Import Schema ====================

class BulkImportResponse(BaseModel):
    imported_count: int
    skipped_count: int
    errors: list[str] = []
