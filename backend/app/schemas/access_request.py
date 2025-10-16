from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class AccessRequestCreate(BaseModel):
    name: str
    email: str
    company: Optional[str] = None
    message: Optional[str] = None


class AccessRequestUpdate(BaseModel):
    status: Optional[str] = None


class AccessRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    company: Optional[str]
    message: Optional[str]
    status: str
    created_at: datetime
