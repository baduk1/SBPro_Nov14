from pydantic import BaseModel, ConfigDict
from typing import Optional


class ArtifactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    job_id: str
    kind: str
    path: str
    size: int
    checksum: Optional[str] = None
