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
from app.schemas.boq import (
    BoqItemOut,
    BoqItemUpdate,
    BoqBulkUpdateRequest,
    BoqBulkUpdateResponse,
    BoqValidationReport
)
from app.services.pricing import apply_prices
from app.services.boq import boq_service, BoqConcurrencyError, BoqValidationError
from app.modules.collaboration.permissions import PermissionChecker

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
    """Get BOQ items for a job with source file information - ownership verified"""
    from app.models.file import File

    # CRITICAL: Verify job ownership first
    j = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get BoQ items with file info via JOIN
    items = db.query(BoqItem, File.filename, File.id.label('file_id'))\
        .join(Job, BoqItem.job_id == Job.id)\
        .join(File, Job.file_id == File.id)\
        .filter(BoqItem.job_id == id)\
        .all()

    # Build response with file info
    result = []
    for boq_item, filename, file_id in items:
        item_dict = {
            "id": boq_item.id,
            "job_id": boq_item.job_id,
            "code": boq_item.code,
            "description": boq_item.description,
            "unit": boq_item.unit,
            "qty": boq_item.qty,
            "source_ref": boq_item.source_ref,
            "mapped_price_item_id": boq_item.mapped_price_item_id,
            "allowance_amount": boq_item.allowance_amount,
            "unit_price": boq_item.unit_price,
            "total_price": boq_item.total_price,
            "created_at": boq_item.created_at,
            "updated_at": boq_item.updated_at,
            "filename": filename,
            "file_id": file_id
        }
        result.append(item_dict)

    return result


@router.patch("/boq/items/{item_id}", response_model=BoqItemOut)
async def update_boq_item(
    item_id: str,
    updates: BoqItemUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Update a single BoQ item.

    Supports optimistic concurrency control via `updated_at` field.
    If provided and doesn't match, returns 409 Conflict.

    Broadcasts update via WebSocket to all connected users in the project.

    **Requires: editor or owner role**
    """
    # Get BoqItem to find project_id
    boq_item = db.query(BoqItem).filter(BoqItem.id == item_id).first()
    if not boq_item:
        raise HTTPException(status_code=404, detail="BoQ item not found")

    # Get Job to find project_id
    job = db.query(Job).filter(Job.id == boq_item.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check permissions: require editor or owner role
    permissions = PermissionChecker()
    project, user_role = permissions.require_project_access(
        job.project_id,
        "editor",  # minimum role required
        db,
        user
    )

    try:
        # Convert to dict and remove None values
        update_data = updates.model_dump(exclude_unset=True)

        item, was_modified = await boq_service.update_boq_item(
            db=db,
            item_id=item_id,
            updates=update_data,
            user=user,
            check_concurrency=True
        )

        return item

    except BoqConcurrencyError as e:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "Concurrency conflict",
                "message": "Item was modified by another user",
                "item_id": e.item_id,
                "expected_version": e.expected_version,
                "actual_version": e.actual_version
            }
        )

    except BoqValidationError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Validation error",
                "field": e.field,
                "message": e.message,
                "item_id": e.item_id
            }
        )


@router.post("/boq/items/bulk", response_model=BoqBulkUpdateResponse)
async def bulk_update_boq_items(
    request: BoqBulkUpdateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Bulk update multiple BoQ items.

    Returns summary with counts of updated/skipped items and any errors.
    Supports optimistic concurrency control via `updated_at` field per item.

    Broadcasts bulk update summary via WebSocket to all connected users in the project.

    **Requires: editor or owner role**
    """
    # Validate at least one item
    if not request.items:
        return BoqBulkUpdateResponse(updated=0, skipped=0, errors=[])

    # Get first item to check project permissions
    first_item_id = request.items[0].id
    boq_item = db.query(BoqItem).filter(BoqItem.id == first_item_id).first()
    if not boq_item:
        raise HTTPException(status_code=404, detail=f"BoQ item {first_item_id} not found")

    # Get Job to find project_id
    job = db.query(Job).filter(Job.id == boq_item.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check permissions: require editor or owner role
    permissions = PermissionChecker()
    project, user_role = permissions.require_project_access(
        job.project_id,
        "editor",  # minimum role required
        db,
        user
    )

    # Convert Pydantic models to dicts
    updates = [item.model_dump(exclude_unset=True) for item in request.items]

    summary = await boq_service.bulk_update_boq_items(
        db=db,
        updates=updates,
        user=user
    )

    return summary


@router.get("/{id}/boq/validate", response_model=BoqValidationReport)
def validate_boq(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Validate integrity of all BoQ items for a job.

    Checks:
    - Missing required fields
    - Invalid numeric values (negative)
    - Total price calculations
    - Duplicate codes
    """
    report = boq_service.validate_boq_integrity(
        db=db,
        job_id=id,
        user=user
    )

    return report
