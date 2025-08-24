from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import csv, io
from typing import List

from app.db.session import get_db
from app.models.price_list import PriceList
from app.models.price_item import PriceItem
from app.schemas.price import PriceListCreate, PriceListOut

router = APIRouter()


@router.get("/price-lists", response_model=List[PriceListOut])
def list_price_lists(db: Session = Depends(get_db)):
    return db.query(PriceList).all()


@router.post("/price-lists", response_model=PriceListOut)
def create_price_list(payload: PriceListCreate, db: Session = Depends(get_db)):
    p = PriceList(**payload.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.post("/price-lists/{id}/items:bulk")
def bulk_items(id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    pl = db.query(PriceList).get(id)
    if not pl:
        raise HTTPException(status_code=404, detail="Price list not found")
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    created = 0
    for row in reader:
        item = PriceItem(
            price_list_id=id,
            code=row.get("code", "") or "",
            description=row.get("description", "") or "",
            unit=row.get("unit", "") or "",
            rate=float(row.get("rate", "0") or 0),
        )
        db.add(item)
        created += 1
    db.commit()
    return {"created": created}


@router.patch("/price-lists/{id}", response_model=PriceListOut)
def update_price_list(id: str, payload: PriceListCreate, db: Session = Depends(get_db)):
    pl = db.query(PriceList).get(id)
    if not pl:
        raise HTTPException(status_code=404, detail="Price list not found")
    for k, v in payload.dict().items():
        setattr(pl, k, v)
    db.commit()
    db.refresh(pl)
    return pl
