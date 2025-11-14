"""
Pydantic schemas for third-party integrations (Notion, etc.)
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


# ==================== Notion Connection ====================

class NotionConnectionRequest(BaseModel):
    """Request to complete Notion OAuth connection"""
    code: str = Field(..., description="OAuth authorization code from Notion callback")


class NotionConnectionResponse(BaseModel):
    """Response after successful Notion connection"""
    success: bool
    workspace_name: str
    workspace_id: str
    bot_id: str
    message: str = "Notion connected successfully"


# ==================== Notion Export ====================

class NotionExportRequest(BaseModel):
    """Request to export BoQ data to Notion"""
    job_id: str = Field(..., description="Job ID containing BoQ data to export")
    parent_page_id: Optional[str] = Field(None, description="Optional: Notion page ID to nest under")
    include_charts: bool = Field(True, description="Include cost breakdown charts")
    include_download_links: bool = Field(True, description="Include CSV/Excel/PDF download links")


class NotionExportResponse(BaseModel):
    """Response after successful export to Notion"""
    success: bool
    notion_page_id: str
    notion_page_url: str
    message: str
    items_exported: int = Field(..., description="Number of BoQ items exported")


# ==================== Integration Status ====================

class IntegrationStatus(BaseModel):
    """Current integration connection status for a user"""
    connected: bool
    integration_type: str  # 'notion', 'zapier', etc.
    workspace_name: Optional[str] = None
    workspace_id: Optional[str] = None
    connected_at: Optional[datetime] = None
    is_active: bool = True


class IntegrationDisconnectResponse(BaseModel):
    """Response after disconnecting an integration"""
    success: bool
    message: str
    integration_type: str


# ==================== Generic Integration Schemas ====================

class IntegrationCreate(BaseModel):
    """Base schema for creating integrations"""
    integration_type: str
    access_token: str
    refresh_token: Optional[str] = None
    workspace_id: Optional[str] = None
    workspace_name: Optional[str] = None


class IntegrationOut(BaseModel):
    """Schema for integration output (excludes sensitive tokens)"""
    id: str
    integration_type: str
    workspace_name: Optional[str]
    workspace_id: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2 (orm_mode replacement)
