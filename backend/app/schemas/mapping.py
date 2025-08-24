from pydantic import BaseModel, ConfigDict
from typing import Optional


class DwgLayerMapIn(BaseModel):
    layer_name: str
    element_type: str
    default_unit: str
    default_code: Optional[str] = None


class IfcClassMapIn(BaseModel):
    ifc_class: str
    element_type: str
    default_unit: str
    default_code: Optional[str] = None
