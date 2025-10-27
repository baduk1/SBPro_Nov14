from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.api.deps import current_user
from app.db.session import get_db
from app.models.job import Job
from app.models.boq_item import BoqItem
from app.models.price_list import PriceList
from app.models.supplier import Supplier, SupplierPriceItem
from app.models.user import User
from app.schemas.boq import BoqItemOut
from app.services.pricing import apply_prices

router = APIRouter()


class ApplyPricesRequest(BaseModel):
    supplier_id: Optional[str] = None
    price_list_id: Optional[str] = None  # Backward compatibility with admin price lists


@router.post("/{id}/apply-prices", response_model=List[BoqItemOut])
def apply_prices_endpoint(
    id: str,
    payload: ApplyPricesRequest = Body(default=ApplyPricesRequest()),
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Apply prices to job's takeoff items - ownership verified.

    - If supplier_id is provided: Use supplier's price items (NEW)
    - If price_list_id is provided: Use admin price list (OLD, backward compatible)
    - If neither: Try to find default supplier, fallback to active admin price list
    """
    # CRITICAL: Verify job ownership before modifying prices
    j = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")

    # NEW: Supplier-based pricing
    if payload.supplier_id:
        # Verify supplier belongs to user
        supplier = db.query(Supplier).filter(
            Supplier.id == payload.supplier_id,
            Supplier.user_id == user.id
        ).first()

        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")

        # Get supplier's price items
        price_items = db.query(SupplierPriceItem).filter(
            SupplierPriceItem.supplier_id == supplier.id,
            SupplierPriceItem.is_active == True  # noqa: E712
        ).all()

        if not price_items:
            raise HTTPException(status_code=400, detail=f"Supplier '{supplier.name}' has no active price items")

        # Get BoQ items
        boq_items = db.query(BoqItem).filter(BoqItem.job_id == id).all()

        matched_count = 0
        for boq_item in boq_items:
            # Match by code (BOQ code vs Supplier price item code)
            matching_price = next(
                (p for p in price_items if p.code == boq_item.code),
                None
            )
            if matching_price:
                # Price is already in major units (e.g., 44.80 for £44.80)
                boq_item.unit_price = matching_price.price
                boq_item.total_price = boq_item.qty * boq_item.unit_price
                # Note: mapped_price_item_id is for admin price lists, not supplier prices
                # We don't set it here to avoid foreign key constraint errors
                matched_count += 1

        db.commit()

        if matched_count == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No items matched. Supplier '{supplier.name}' price codes don't match any BOQ item codes."
            )

        return boq_items

    # OLD: Admin price list (backward compatibility)
    if payload.price_list_id:
        j.price_list_id = payload.price_list_id
        db.commit()

    if not j.price_list_id:
        # Try to find default supplier first
        default_supplier = db.query(Supplier).filter(
            Supplier.user_id == user.id,
            Supplier.is_default == True  # noqa: E712
        ).first()

        if default_supplier:
            # Recursively call with default supplier
            payload.supplier_id = default_supplier.id
            return apply_prices_endpoint(id, payload, user, db)

        # Fallback to admin price list
        pl = db.query(PriceList).filter(
            PriceList.is_active == True  # noqa: E712
        ).order_by(PriceList.effective_from.desc().nullslast()).first()

        if not pl:
            raise HTTPException(
                status_code=400,
                detail="No active price list or default supplier found. Please create a supplier first."
            )

        j.price_list_id = pl.id
        db.commit()

    items = apply_prices(db, id, j.price_list_id)
    return items


@router.get("/{id}/boq", response_model=List[BoqItemOut])
def get_boq(id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    """Get BOQ items for a job - ownership verified"""
    # CRITICAL: Verify job ownership first
    j = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")

    return db.query(BoqItem).filter(BoqItem.job_id == id).all()
