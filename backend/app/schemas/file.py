from pydantic import BaseModel, ConfigDict
from typing import Dict


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
