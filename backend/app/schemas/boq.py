from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


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
    unit_price: float = 0.0
    total_price: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Source file information
    file_id: Optional[str] = None
    filename: Optional[str] = None


class MappingPatchItem(BaseModel):
    id: str
    code: Optional[str] = None
    mapped_price_item_id: Optional[str] = None
    allowance_amount: Optional[float] = None


class MappingPatchRequest(BaseModel):
    items: list[MappingPatchItem]


class BoqItemUpdate(BaseModel):
    """Schema for updating a single BoQ item"""
    code: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    qty: Optional[float] = Field(None, ge=0, description="Quantity must be non-negative")
    unit_price: Optional[float] = Field(None, ge=0, description="Unit price must be non-negative")
    allowance_amount: Optional[float] = Field(None, ge=0, description="Allowance must be non-negative")
    mapped_price_item_id: Optional[str] = None
    updated_at: Optional[str] = Field(
        None,
        description="ISO timestamp for optimistic concurrency control"
    )


class BoqBulkUpdateItem(BaseModel):
    """Schema for bulk update - includes item ID"""
    id: str = Field(..., description="BoQ item ID")
    code: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    qty: Optional[float] = Field(None, ge=0)
    unit_price: Optional[float] = Field(None, ge=0)
    allowance_amount: Optional[float] = Field(None, ge=0)
    mapped_price_item_id: Optional[str] = None
    updated_at: Optional[str] = Field(
        None,
        description="ISO timestamp for optimistic concurrency control"
    )


class BoqBulkUpdateRequest(BaseModel):
    """Schema for bulk update request"""
    items: List[BoqBulkUpdateItem] = Field(..., min_length=1, max_length=500)


class BoqBulkUpdateResponse(BaseModel):
    """Schema for bulk update response"""
    total: int
    updated: int
    skipped: int
    errors: List[dict]
    items: List[BoqItemOut]


class BoqValidationError(BaseModel):
    """Schema for validation error"""
    item_id: Optional[str]
    field: str
    message: str


class BoqValidationReport(BaseModel):
    """Schema for validation report"""
    valid: bool
    total_items: int
    errors: List[dict]
    warnings: List[dict]
