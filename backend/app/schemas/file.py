from pydantic import BaseModel, ConfigDict
from typing import Dict, Optional


class PresignUploadRequest(BaseModel):
    project_id: str
    filename: str
    file_type: str
    content_type: Optional[str] = None


class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    filename: str
    type: str
    size: int
    project_id: str


class PresignedUpload(BaseModel):
    file_id: str
    upload_url: str
    method: str = "PUT"
    headers: Dict[str, str] = {}
