from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.mapping import DwgLayerMap, IfcClassMap
from app.schemas.mapping import DwgLayerMapIn, IfcClassMapIn

router = APIRouter()


@router.get("/dwg-layers", response_model=List[DwgLayerMapIn])
def get_dwg_layers(db: Session = Depends(get_db)):
    return db.query(DwgLayerMap).all()


@router.put("/dwg-layers")
def put_dwg_layers(payload: List[DwgLayerMapIn], db: Session = Depends(get_db)):
    db.query(DwgLayerMap).delete()
    for p in payload:
        db.add(DwgLayerMap(**p.dict()))
    db.commit()
    return {"saved": len(payload)}


@router.get("/ifc-classes", response_model=List[IfcClassMapIn])
def get_ifc_classes(db: Session = Depends(get_db)):
    return db.query(IfcClassMap).all()


@router.put("/ifc-classes")
def put_ifc_classes(payload: List[IfcClassMapIn], db: Session = Depends(get_db)):
    db.query(IfcClassMap).delete()
    for p in payload:
        db.add(IfcClassMap(**p.dict()))
    db.commit()
    return {"saved": len(payload)}
