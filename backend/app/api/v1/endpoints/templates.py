from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.template import Template, TemplateItem
from app.models.boq_item import BoqItem
from app.models.job import Job
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateOut,
    TemplateListOut,
    TemplateItemCreate,
    TemplateItemUpdate,
    TemplateItemOut,
    ApplyTemplateRequest
)

router = APIRouter()


@router.get("", response_model=List[TemplateListOut])
def list_templates(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List all templates for current user"""
    templates = db.query(Template).filter(Template.user_id == user.id).all()

    # Add items count
    result = []
    for template in templates:
        template_dict = {
            "id": template.id,
            "user_id": template.user_id,
            "name": template.name,
            "description": template.description,
            "category": template.category,
            "is_default": template.is_default,
            "created_at": template.created_at,
            "updated_at": template.updated_at,
            "items_count": len(template.items)
        }
        result.append(template_dict)

    return result


@router.post("", response_model=TemplateOut)
def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new template"""
    # Create template
    template = Template(
        user_id=user.id,
        name=data.name,
        description=data.description,
        category=data.category,
        is_default=data.is_default
    )
    db.add(template)
    db.flush()  # Get template.id

    # Create items
    for item_data in data.items:
        item = TemplateItem(
            template_id=template.id,
            element_type=item_data.element_type,
            description=item_data.description,
            unit=item_data.unit,
            default_unit_price=item_data.default_unit_price,
            default_currency=item_data.default_currency,
            quantity_multiplier=item_data.quantity_multiplier,
            sort_order=item_data.sort_order
        )
        db.add(item)

    db.commit()
    db.refresh(template)

    return template


@router.get("/{template_id}", response_model=TemplateOut)
def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get template by ID"""
    template = db.query(Template).filter(
        Template.id == template_id,
        Template.user_id == user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return template


@router.patch("/{template_id}", response_model=TemplateOut)
def update_template(
    template_id: str,
    data: TemplateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update template"""
    template = db.query(Template).filter(
        Template.id == template_id,
        Template.user_id == user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update fields
    if data.name is not None:
        template.name = data.name
    if data.description is not None:
        template.description = data.description
    if data.category is not None:
        template.category = data.category
    if data.is_default is not None:
        template.is_default = data.is_default

    db.commit()
    db.refresh(template)

    return template


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete template"""
    template = db.query(Template).filter(
        Template.id == template_id,
        Template.user_id == user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()

    return {"message": "Template deleted successfully"}


@router.post("/{template_id}/clone", response_model=TemplateOut)
def clone_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Clone a template with all its items"""
    # Get original template
    original = db.query(Template).filter(
        Template.id == template_id,
        Template.user_id == user.id
    ).first()

    if not original:
        raise HTTPException(status_code=404, detail="Template not found")

    # Create new template with copied data
    new_template = Template(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name=f"{original.name} (Copy)",
        description=original.description,
        category=original.category,
        is_default=False  # Clones are never default
    )
    db.add(new_template)
    db.flush()

    # Clone all items
    for original_item in original.items:
        new_item = TemplateItem(
            id=str(uuid.uuid4()),
            template_id=new_template.id,
            element_type=original_item.element_type,
            description=original_item.description,
            unit=original_item.unit,
            default_unit_price=original_item.default_unit_price,
            default_currency=original_item.default_currency,
            quantity_multiplier=original_item.quantity_multiplier,
            sort_order=original_item.sort_order
        )
        db.add(new_item)

    db.commit()
    db.refresh(new_template)

    return new_template


# ===== Template Items =====

@router.get("/{template_id}/items", response_model=List[TemplateItemOut])
def list_template_items(
    template_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List items in a template"""
    template = db.query(Template).filter(
        Template.id == template_id,
        Template.user_id == user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return template.items


@router.post("/{template_id}/items", response_model=TemplateItemOut)
def create_template_item(
    template_id: str,
    data: TemplateItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Add item to template"""
    template = db.query(Template).filter(
        Template.id == template_id,
        Template.user_id == user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    item = TemplateItem(
        template_id=template_id,
        element_type=data.element_type,
        description=data.description,
        unit=data.unit,
        default_unit_price=data.default_unit_price,
        default_currency=data.default_currency,
        quantity_multiplier=data.quantity_multiplier,
        sort_order=data.sort_order
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.patch("/{template_id}/items/{item_id}", response_model=TemplateItemOut)
def update_template_item(
    template_id: str,
    item_id: str,
    data: TemplateItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update template item"""
    # Verify template ownership
    template = db.query(Template).filter(
        Template.id == template_id,
        Template.user_id == user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Get item
    item = db.query(TemplateItem).filter(
        TemplateItem.id == item_id,
        TemplateItem.template_id == template_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Update fields
    if data.element_type is not None:
        item.element_type = data.element_type
    if data.description is not None:
        item.description = data.description
    if data.unit is not None:
        item.unit = data.unit
    if data.default_unit_price is not None:
        item.default_unit_price = data.default_unit_price
    if data.default_currency is not None:
        item.default_currency = data.default_currency
    if data.quantity_multiplier is not None:
        item.quantity_multiplier = data.quantity_multiplier
    if data.sort_order is not None:
        item.sort_order = data.sort_order

    db.commit()
    db.refresh(item)

    return item


@router.delete("/{template_id}/items/{item_id}")
def delete_template_item(
    template_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete template item"""
    # Verify template ownership
    template = db.query(Template).filter(
        Template.id == template_id,
        Template.user_id == user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Get and delete item
    item = db.query(TemplateItem).filter(
        TemplateItem.id == item_id,
        TemplateItem.template_id == template_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()

    return {"message": "Item deleted successfully"}


@router.post("/apply", response_model=dict)
def apply_template_to_job(
    data: ApplyTemplateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Apply template to a job's BoQ items.
    Updates existing BoQ items with template pricing/multipliers.
    """
    # Verify template ownership
    template = db.query(Template).filter(
        Template.id == data.template_id,
        Template.user_id == user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Verify job ownership
    job = db.query(Job).filter(Job.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get job's BoQ items
    boq_items = db.query(BoqItem).filter(BoqItem.job_id == data.job_id).all()

    if not boq_items:
        raise HTTPException(status_code=400, detail="Job has no BoQ items")

    # Create mapping: element_type -> template_item
    template_map = {item.element_type: item for item in template.items}

    # Apply template to matching BoQ items
    applied_count = 0
    for boq_item in boq_items:
        template_item = template_map.get(boq_item.element_type)
        if template_item:
            # Apply multiplier
            if template_item.quantity_multiplier != 1.0:
                boq_item.qty = boq_item.qty * template_item.quantity_multiplier

            # Apply default pricing if not already priced
            if template_item.default_unit_price and (not boq_item.unit_price or boq_item.unit_price == 0):
                boq_item.unit_price = template_item.default_unit_price
                boq_item.total_price = boq_item.qty * boq_item.unit_price

            applied_count += 1

    db.commit()

    return {
        "message": f"Template applied to {applied_count} of {len(boq_items)} items",
        "applied_count": applied_count,
        "total_items": len(boq_items)
    }
