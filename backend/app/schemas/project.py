from pydantic import BaseModel, ConfigDict
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "ACTIVE"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    owner_id: str
    name: str
    description: Optional[str] = None
    status: str = "ACTIVE"
