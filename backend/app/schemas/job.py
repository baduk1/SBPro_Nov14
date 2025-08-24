from pydantic import BaseModel, ConfigDict
from typing import Optional


class JobCreate(BaseModel):
    project_id: str
    file_id: str
    price_list_id: Optional[str] = None


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    file_id: str
    status: str
    progress: int
    price_list_id: Optional[str] = None


class JobEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    job_id: str
    ts: str
    stage: str
    message: str
    details: Optional[str] = None
