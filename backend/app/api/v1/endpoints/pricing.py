from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.job import Job
from app.models.boq_item import BoqItem
from app.schemas.boq import BoqItemOut
from app.services.pricing import apply_prices

router = APIRouter()


@router.post("/{id}/apply-prices", response_model=List[BoqItemOut])
def apply_prices_endpoint(id: str, db: Session = Depends(get_db)):
    j = db.query(Job).get(id)
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    if not j.price_list_id:
        raise HTTPException(status_code=400, detail="Job has no price_list_id")
    items = apply_prices(db, id, j.price_list_id)
    return items


@router.get("/{id}/boq", response_model=List[BoqItemOut])
def get_boq(id: str, db: Session = Depends(get_db)):
    return db.query(BoqItem).filter(BoqItem.job_id == id).all()
