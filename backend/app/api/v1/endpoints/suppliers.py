from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import csv
import io

from app.api.deps import current_user
from app.db.session import get_db
from app.models.user import User
from app.models.supplier import Supplier, SupplierPriceItem
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierOut,
    SupplierPriceItemCreate,
    SupplierPriceItemUpdate,
    SupplierPriceItemOut,
    BulkImportResponse
)

router = APIRouter()


# ==================== Supplier CRUD ====================

@router.get("", response_model=List[SupplierOut])
def list_suppliers(
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """List all suppliers for the current user"""
    suppliers = db.query(Supplier).filter(Supplier.user_id == user.id).all()

    # Add price_items_count
    result = []
    for supplier in suppliers:
        count = db.query(func.count(SupplierPriceItem.id)).filter(
            SupplierPriceItem.supplier_id == supplier.id
        ).scalar()
        supplier_dict = SupplierOut.model_validate(supplier).model_dump()
        supplier_dict['price_items_count'] = count
        result.append(SupplierOut(**supplier_dict))

    return result


@router.post("", response_model=SupplierOut)
def create_supplier(
    payload: SupplierCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Create a new supplier"""
    # If this is set as default, unset all other defaults
    if payload.is_default:
        db.query(Supplier).filter(
            Supplier.user_id == user.id,
            Supplier.is_default == True
        ).update({"is_default": False})

    supplier = Supplier(
        user_id=user.id,
        name=payload.name,
        contact_info=payload.contact_info,
        is_default=payload.is_default
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    supplier_dict = SupplierOut.model_validate(supplier).model_dump()
    supplier_dict['price_items_count'] = 0
    return SupplierOut(**supplier_dict)


@router.get("/{id}", response_model=SupplierOut)
def get_supplier(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Get supplier details"""
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.user_id == user.id
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    count = db.query(func.count(SupplierPriceItem.id)).filter(
        SupplierPriceItem.supplier_id == supplier.id
    ).scalar()

    supplier_dict = SupplierOut.model_validate(supplier).model_dump()
    supplier_dict['price_items_count'] = count
    return SupplierOut(**supplier_dict)


@router.patch("/{id}", response_model=SupplierOut)
def update_supplier(
    id: str,
    payload: SupplierUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Update supplier"""
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.user_id == user.id
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # If setting as default, unset others
    if payload.is_default:
        db.query(Supplier).filter(
            Supplier.user_id == user.id,
            Supplier.id != id,
            Supplier.is_default == True
        ).update({"is_default": False})

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)

    db.commit()
    db.refresh(supplier)

    count = db.query(func.count(SupplierPriceItem.id)).filter(
        SupplierPriceItem.supplier_id == supplier.id
    ).scalar()

    supplier_dict = SupplierOut.model_validate(supplier).model_dump()
    supplier_dict['price_items_count'] = count
    return SupplierOut(**supplier_dict)


@router.delete("/{id}")
def delete_supplier(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Delete supplier and all associated price items"""
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.user_id == user.id
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    db.delete(supplier)
    db.commit()
    return {"deleted": True}


# ==================== Price Items CRUD ====================

@router.get("/{id}/items", response_model=List[SupplierPriceItemOut])
def list_price_items(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """List all price items for a supplier"""
    # Verify ownership
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.user_id == user.id
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    items = db.query(SupplierPriceItem).filter(
        SupplierPriceItem.supplier_id == id
    ).all()

    return items


@router.post("/{id}/items", response_model=SupplierPriceItemOut)
def create_price_item(
    id: str,
    payload: SupplierPriceItemCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Add a new price item to supplier"""
    # Verify ownership
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.user_id == user.id
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    item = SupplierPriceItem(
        supplier_id=id,
        **payload.model_dump()
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{id}/items/{item_id}", response_model=SupplierPriceItemOut)
def update_price_item(
    id: str,
    item_id: str,
    payload: SupplierPriceItemUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Update a price item"""
    # Verify ownership via supplier
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.user_id == user.id
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    item = db.query(SupplierPriceItem).filter(
        SupplierPriceItem.id == item_id,
        SupplierPriceItem.supplier_id == id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Price item not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{id}/items/{item_id}")
def delete_price_item(
    id: str,
    item_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Delete a price item"""
    # Verify ownership via supplier
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.user_id == user.id
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    item = db.query(SupplierPriceItem).filter(
        SupplierPriceItem.id == item_id,
        SupplierPriceItem.supplier_id == id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Price item not found")

    db.delete(item)
    db.commit()
    return {"deleted": True}


# ==================== Bulk Import ====================

@router.post("/{id}/items/import", response_model=BulkImportResponse)
async def bulk_import_price_items(
    id: str,
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Bulk import price items from CSV file.

    Expected CSV format:
    code,description,unit,price,currency
    BRK-001,Standard Brick,piece,50,GBP
    """
    # Verify ownership
    supplier = db.query(Supplier).filter(
        Supplier.id == id,
        Supplier.user_id == user.id
    ).first()

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    csv_content = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(csv_content)

    imported_count = 0
    skipped_count = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            # Validate required fields
            if not all(k in row for k in ['code', 'description', 'unit', 'price']):
                errors.append(f"Row {row_num}: Missing required fields")
                skipped_count += 1
                continue

            # Convert price to minor units (pence/cents)
            try:
                price_float = float(row['price'])
                price_minor = int(price_float * 100)
            except ValueError:
                errors.append(f"Row {row_num}: Invalid price format")
                skipped_count += 1
                continue

            item = SupplierPriceItem(
                supplier_id=id,
                code=row['code'],
                description=row['description'],
                unit=row['unit'],
                price=price_minor,
                currency=row.get('currency', 'GBP'),
                is_active=True
            )
            db.add(item)
            imported_count += 1

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            skipped_count += 1

    db.commit()

    return BulkImportResponse(
        imported_count=imported_count,
        skipped_count=skipped_count,
        errors=errors
    )
