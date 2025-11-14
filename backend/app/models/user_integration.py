"""
User Integration Model
Stores OAuth tokens and configuration for third-party integrations (Notion, etc.)
"""

import json
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4
from typing import Optional, Dict, Any
from datetime import datetime

from app.models.base import Base


class UserIntegration(Base):
    """
    Third-party integration connections for users

    Supports:
    - Notion (OAuth 2.0)
    - Future: Zapier, Make, Google Sheets, etc.
    """

    __tablename__ = "user_integrations"

    # Primary fields
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    integration_type = Column(String(50), nullable=False, index=True)  # 'notion', 'zapier', etc.

    # OAuth tokens
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Integration-specific metadata
    workspace_id = Column(String(255), nullable=True)  # Notion workspace ID
    workspace_name = Column(String(255), nullable=True)  # Human-readable name
    bot_id = Column(String(255), nullable=True)  # Notion bot user ID

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Additional config (JSON as TEXT for SQLite compatibility)
    config_data = Column(Text, nullable=True)  # Stored as JSON string

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="integrations")

    def get_config(self) -> Dict[str, Any]:
        """Parse config JSON string to dict"""
        if not self.config_data:
            return {}
        try:
            return json.loads(self.config_data)
        except json.JSONDecodeError:
            return {}

    def set_config(self, data: Dict[str, Any]):
        """Set config from dict (converts to JSON string)"""
        self.config_data = json.dumps(data)

    def __repr__(self):
        return f"<UserIntegration(id={self.id}, type={self.integration_type}, user_id={self.user_id})>"
