from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.job import Job
from app.models.boq_item import BoqItem
from app.schemas.boq import BoqItemOut, MappingPatchRequest

router = APIRouter()


@router.get("/{id}/takeoff", response_model=List[BoqItemOut])
def get_takeoff(id: str, db: Session = Depends(get_db)):
    j = db.query(Job).get(id)
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    items = db.query(BoqItem).filter(BoqItem.job_id == id).all()
    return items


@router.patch("/{id}/mapping")
def patch_mapping(id: str, payload: MappingPatchRequest, db: Session = Depends(get_db)):
    j = db.query(Job).get(id)
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    updated = 0
    for item_patch in payload.items:
        it = db.query(BoqItem).get(item_patch.id)
        if not it:
            continue
        if item_patch.code is not None:
            it.code = item_patch.code
        if item_patch.mapped_price_item_id is not None:
            it.mapped_price_item_id = item_patch.mapped_price_item_id
        if item_patch.allowance_amount is not None:
            it.allowance_amount = item_patch.allowance_amount
        updated += 1
    db.commit()
    return {"updated": updated}
