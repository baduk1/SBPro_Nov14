from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.estimate import Estimate, EstimateItem, CostAdjustment
from app.schemas.estimate import (
    EstimateCreate,
    EstimateUpdate,
    EstimateOut,
    EstimateListOut,
    EstimateItemCreate,
    EstimateItemUpdate,
    EstimateItemOut,
    CostAdjustmentCreate,
    CostAdjustmentUpdate,
    CostAdjustmentOut
)

router = APIRouter()


def recalculate_estimate_totals(estimate: Estimate, db: Session):
    """Recalculate estimate subtotal and total"""
    # Calculate subtotal from items
    subtotal = sum(item.total_price for item in estimate.items)
    estimate.subtotal = subtotal

    # Calculate total with adjustments
    total = subtotal
    for adjustment in estimate.adjustments:
        if adjustment.adjustment_type == "percentage":
            adjustment.amount = subtotal * (adjustment.value / 100)
        elif adjustment.adjustment_type == "fixed":
            adjustment.amount = adjustment.value
        else:
            adjustment.amount = 0

        total += adjustment.amount

    estimate.total = total
    db.flush()


@router.get("", response_model=List[EstimateListOut])
def list_estimates(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List all estimates for current user"""
    estimates = db.query(Estimate).filter(Estimate.user_id == user.id).all()

    # Add items count
    result = []
    for estimate in estimates:
        estimate_dict = {
            "id": estimate.id,
            "user_id": estimate.user_id,
            "job_id": estimate.job_id,
            "project_id": estimate.project_id,
            "name": estimate.name,
            "description": estimate.description,
            "subtotal": estimate.subtotal,
            "total": estimate.total,
            "currency": estimate.currency,
            "created_at": estimate.created_at,
            "updated_at": estimate.updated_at,
            "items_count": len(estimate.items)
        }
        result.append(estimate_dict)

    return result


@router.post("", response_model=EstimateOut)
def create_estimate(
    data: EstimateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new estimate"""
    # Create estimate
    estimate = Estimate(
        user_id=user.id,
        job_id=data.job_id,
        project_id=data.project_id,
        name=data.name,
        description=data.description,
        currency=data.currency,
        notes=data.notes,
        tags=data.tags
    )
    db.add(estimate)
    db.flush()  # Get estimate.id

    # Create items
    for item_data in data.items:
        total_price = item_data.quantity * item_data.unit_price
        item = EstimateItem(
            estimate_id=estimate.id,
            boq_item_id=item_data.boq_item_id,
            description=item_data.description,
            element_type=item_data.element_type,
            unit=item_data.unit,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total_price=total_price,
            currency=item_data.currency,
            notes=item_data.notes,
            sort_order=item_data.sort_order
        )
        db.add(item)

    # Create adjustments
    for adj_data in data.adjustments:
        adjustment = CostAdjustment(
            estimate_id=estimate.id,
            name=adj_data.name,
            adjustment_type=adj_data.adjustment_type,
            value=adj_data.value,
            amount=0,  # Will be calculated
            sort_order=adj_data.sort_order
        )
        db.add(adjustment)

    db.flush()

    # Recalculate totals
    db.refresh(estimate)
    recalculate_estimate_totals(estimate, db)

    db.commit()
    db.refresh(estimate)

    return estimate


@router.get("/{estimate_id}", response_model=EstimateOut)
def get_estimate(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get estimate by ID"""
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    return estimate


@router.patch("/{estimate_id}", response_model=EstimateOut)
def update_estimate(
    estimate_id: str,
    data: EstimateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update estimate"""
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    # Update fields
    if data.name is not None:
        estimate.name = data.name
    if data.description is not None:
        estimate.description = data.description
    if data.currency is not None:
        estimate.currency = data.currency
    if data.notes is not None:
        estimate.notes = data.notes
    if data.tags is not None:
        estimate.tags = data.tags

    db.commit()
    db.refresh(estimate)

    return estimate


@router.delete("/{estimate_id}")
def delete_estimate(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete estimate"""
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    db.delete(estimate)
    db.commit()

    return {"message": "Estimate deleted successfully"}


@router.post("/{estimate_id}/clone", response_model=EstimateOut)
def clone_estimate(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Clone an estimate with all its items and adjustments"""
    # Get original estimate
    original = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not original:
        raise HTTPException(status_code=404, detail="Estimate not found")

    # Create new estimate with copied data
    new_estimate = Estimate(
        id=str(uuid.uuid4()),
        user_id=user.id,
        job_id=original.job_id,
        project_id=original.project_id,
        name=f"{original.name} (Copy)",
        description=original.description,
        subtotal=0,  # Will be recalculated
        total=0,  # Will be recalculated
        currency=original.currency,
        notes=original.notes,
        tags=original.tags
    )
    db.add(new_estimate)
    db.flush()

    # Clone all items
    for original_item in original.items:
        new_item = EstimateItem(
            id=str(uuid.uuid4()),
            estimate_id=new_estimate.id,
            boq_item_id=original_item.boq_item_id,
            description=original_item.description,
            element_type=original_item.element_type,
            unit=original_item.unit,
            quantity=original_item.quantity,
            unit_price=original_item.unit_price,
            total_price=original_item.total_price,
            currency=original_item.currency,
            notes=original_item.notes,
            sort_order=original_item.sort_order
        )
        db.add(new_item)

    # Clone all adjustments
    for original_adj in original.adjustments:
        new_adj = CostAdjustment(
            id=str(uuid.uuid4()),
            estimate_id=new_estimate.id,
            name=original_adj.name,
            adjustment_type=original_adj.adjustment_type,
            value=original_adj.value,
            amount=0,  # Will be recalculated
            sort_order=original_adj.sort_order
        )
        db.add(new_adj)

    db.flush()

    # Recalculate totals
    db.refresh(new_estimate)
    recalculate_estimate_totals(new_estimate, db)

    db.commit()
    db.refresh(new_estimate)

    return new_estimate


# ===== Estimate Items =====

@router.get("/{estimate_id}/items", response_model=List[EstimateItemOut])
def list_estimate_items(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List items in an estimate"""
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    return estimate.items


@router.post("/{estimate_id}/items", response_model=EstimateItemOut)
def create_estimate_item(
    estimate_id: str,
    data: EstimateItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Add item to estimate"""
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    total_price = data.quantity * data.unit_price

    item = EstimateItem(
        estimate_id=estimate_id,
        boq_item_id=data.boq_item_id,
        description=data.description,
        element_type=data.element_type,
        unit=data.unit,
        quantity=data.quantity,
        unit_price=data.unit_price,
        total_price=total_price,
        currency=data.currency,
        notes=data.notes,
        sort_order=data.sort_order
    )
    db.add(item)
    db.flush()

    # Recalculate totals
    recalculate_estimate_totals(estimate, db)

    db.commit()
    db.refresh(item)

    return item


@router.patch("/{estimate_id}/items/{item_id}", response_model=EstimateItemOut)
def update_estimate_item(
    estimate_id: str,
    item_id: str,
    data: EstimateItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update estimate item"""
    # Verify estimate ownership
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    # Get item
    item = db.query(EstimateItem).filter(
        EstimateItem.id == item_id,
        EstimateItem.estimate_id == estimate_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Update fields
    if data.description is not None:
        item.description = data.description
    if data.element_type is not None:
        item.element_type = data.element_type
    if data.unit is not None:
        item.unit = data.unit
    if data.quantity is not None:
        item.quantity = data.quantity
    if data.unit_price is not None:
        item.unit_price = data.unit_price
    if data.currency is not None:
        item.currency = data.currency
    if data.notes is not None:
        item.notes = data.notes
    if data.sort_order is not None:
        item.sort_order = data.sort_order

    # Recalculate total_price
    item.total_price = item.quantity * item.unit_price

    db.flush()

    # Recalculate estimate totals
    recalculate_estimate_totals(estimate, db)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/{estimate_id}/items/{item_id}")
def delete_estimate_item(
    estimate_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete estimate item"""
    # Verify estimate ownership
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    # Get and delete item
    item = db.query(EstimateItem).filter(
        EstimateItem.id == item_id,
        EstimateItem.estimate_id == estimate_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.flush()

    # Recalculate totals
    recalculate_estimate_totals(estimate, db)

    db.commit()

    return {"message": "Item deleted successfully"}


# ===== Cost Adjustments =====

@router.get("/{estimate_id}/adjustments", response_model=List[CostAdjustmentOut])
def list_adjustments(
    estimate_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List cost adjustments in an estimate"""
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    return estimate.adjustments


@router.post("/{estimate_id}/adjustments", response_model=CostAdjustmentOut)
def create_adjustment(
    estimate_id: str,
    data: CostAdjustmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Add cost adjustment to estimate"""
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    adjustment = CostAdjustment(
        estimate_id=estimate_id,
        name=data.name,
        adjustment_type=data.adjustment_type,
        value=data.value,
        amount=0,  # Will be calculated
        sort_order=data.sort_order
    )
    db.add(adjustment)
    db.flush()

    # Recalculate totals
    recalculate_estimate_totals(estimate, db)

    db.commit()
    db.refresh(adjustment)

    return adjustment


@router.patch("/{estimate_id}/adjustments/{adjustment_id}", response_model=CostAdjustmentOut)
def update_adjustment(
    estimate_id: str,
    adjustment_id: str,
    data: CostAdjustmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update cost adjustment"""
    # Verify estimate ownership
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    # Get adjustment
    adjustment = db.query(CostAdjustment).filter(
        CostAdjustment.id == adjustment_id,
        CostAdjustment.estimate_id == estimate_id
    ).first()

    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")

    # Update fields
    if data.name is not None:
        adjustment.name = data.name
    if data.adjustment_type is not None:
        adjustment.adjustment_type = data.adjustment_type
    if data.value is not None:
        adjustment.value = data.value
    if data.sort_order is not None:
        adjustment.sort_order = data.sort_order

    db.flush()

    # Recalculate totals
    recalculate_estimate_totals(estimate, db)

    db.commit()
    db.refresh(adjustment)

    return adjustment


@router.delete("/{estimate_id}/adjustments/{adjustment_id}")
def delete_adjustment(
    estimate_id: str,
    adjustment_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete cost adjustment"""
    # Verify estimate ownership
    estimate = db.query(Estimate).filter(
        Estimate.id == estimate_id,
        Estimate.user_id == user.id
    ).first()

    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    # Get and delete adjustment
    adjustment = db.query(CostAdjustment).filter(
        CostAdjustment.id == adjustment_id,
        CostAdjustment.estimate_id == estimate_id
    ).first()

    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")

    db.delete(adjustment)
    db.flush()

    # Recalculate totals
    recalculate_estimate_totals(estimate, db)

    db.commit()

    return {"message": "Adjustment deleted successfully"}
