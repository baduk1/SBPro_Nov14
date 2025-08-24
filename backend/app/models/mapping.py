from sqlalchemy import Column, String
from uuid import uuid4

from app.models.base import Base


class DwgLayerMap(Base):
    __tablename__ = "dwg_layer_map"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    layer_name = Column(String, unique=True, index=True, nullable=False)
    element_type = Column(String, nullable=False)
    default_unit = Column(String, nullable=False)
    default_code = Column(String, nullable=True)


class IfcClassMap(Base):
    __tablename__ = "ifc_class_map"
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    ifc_class = Column(String, unique=True, index=True, nullable=False)
    element_type = Column(String, nullable=False)
    default_unit = Column(String, nullable=False)
    default_code = Column(String, nullable=True)
