"""
BoQ (Bill of Quantities) Service

Business logic for BoQ item operations including validation and bulk updates.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.boq_item import BoqItem
from app.models.job import Job
from app.models.user import User
from app.models.project import Project

logger = logging.getLogger(__name__)


def get_project_id_from_job(db: Session, job_id: str) -> Optional[str]:
    """Get project_id from job_id"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if job:
        return job.project_id
    return None


class BoqValidationError(Exception):
    """Custom exception for BoQ validation errors"""
    def __init__(self, field: str, message: str, item_id: Optional[str] = None):
        self.field = field
        self.message = message
        self.item_id = item_id
        super().__init__(f"Validation error on '{field}': {message}")


class BoqConcurrencyError(Exception):
    """Custom exception for optimistic concurrency conflicts"""
    def __init__(self, item_id: str, expected_version: str, actual_version: str):
        self.item_id = item_id
        self.expected_version = expected_version
        self.actual_version = actual_version
        super().__init__(
            f"Concurrency conflict for item {item_id}: "
            f"expected version {expected_version}, but found {actual_version}"
        )


class BoqService:
    """Service for BoQ operations"""

    @staticmethod
    def validate_boq_item_data(data: Dict[str, Any]) -> List[str]:
        """
        Validate BoQ item data.

        Returns list of validation error messages (empty list if valid).
        """
        errors = []

        # Validate quantity
        if "qty" in data:
            qty = data["qty"]
            if not isinstance(qty, (int, float)):
                errors.append("quantity must be a number")
            elif qty < 0:
                errors.append("quantity cannot be negative")

        # Validate unit_price
        if "unit_price" in data:
            unit_price = data["unit_price"]
            if not isinstance(unit_price, (int, float)):
                errors.append("unit_price must be a number")
            elif unit_price < 0:
                errors.append("unit_price cannot be negative")

        # Validate allowance_amount
        if "allowance_amount" in data:
            allowance = data["allowance_amount"]
            if not isinstance(allowance, (int, float)):
                errors.append("allowance_amount must be a number")
            elif allowance < 0:
                errors.append("allowance_amount cannot be negative")

        # Validate unit (if provided, must not be empty)
        if "unit" in data:
            unit = data["unit"]
            if not unit or (isinstance(unit, str) and not unit.strip()):
                errors.append("unit cannot be empty")

        # Validate description (if provided, must not be empty)
        if "description" in data:
            desc = data["description"]
            if not desc or (isinstance(desc, str) and not desc.strip()):
                errors.append("description cannot be empty")

        return errors

    @staticmethod
    async def update_boq_item(
        db: Session,
        item_id: str,
        updates: Dict[str, Any],
        user: User,
        check_concurrency: bool = True,
        broadcast: bool = True
    ) -> Tuple[BoqItem, bool]:
        """
        Update a single BoQ item.

        Args:
            db: Database session
            item_id: BoQ item ID
            updates: Dictionary of fields to update
            user: Current user (for ownership check)
            check_concurrency: Whether to check optimistic concurrency (updated_at)

        Returns:
            Tuple of (updated_item, was_modified)

        Raises:
            BoqValidationError: If validation fails
            BoqConcurrencyError: If optimistic concurrency check fails
            HTTPException: If item not found or access denied
        """
        from fastapi import HTTPException

        # Get item and verify ownership through job
        item = db.query(BoqItem).filter(BoqItem.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="BoQ item not found")

        # Verify ownership through job
        job = db.query(Job).filter(Job.id == item.job_id).first()
        if not job or job.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Optimistic concurrency check
        if check_concurrency and "updated_at" in updates:
            expected_updated_at = updates.pop("updated_at")

            # Parse timestamp if string
            if isinstance(expected_updated_at, str):
                try:
                    expected_updated_at = datetime.fromisoformat(expected_updated_at.replace('Z', '+00:00'))
                except ValueError:
                    raise BoqValidationError("updated_at", "Invalid timestamp format")

            # Compare timestamps (allow 1 second tolerance for rounding)
            if item.updated_at:
                diff = abs((item.updated_at - expected_updated_at).total_seconds())
                if diff > 1:
                    raise BoqConcurrencyError(
                        item_id=item_id,
                        expected_version=expected_updated_at.isoformat(),
                        actual_version=item.updated_at.isoformat()
                    )

        # Validate updates
        validation_errors = BoqService.validate_boq_item_data(updates)
        if validation_errors:
            raise BoqValidationError(
                field="multiple",
                message="; ".join(validation_errors),
                item_id=item_id
            )

        # Track if anything was actually modified
        was_modified = False

        # Apply updates
        for key, value in updates.items():
            if hasattr(item, key):
                # Only update if value actually changed
                if getattr(item, key) != value:
                    setattr(item, key, value)
                    was_modified = True

        # Recalculate total_price if qty or unit_price changed
        if "qty" in updates or "unit_price" in updates:
            item.total_price = item.qty * item.unit_price
            was_modified = True

        # Update timestamp only if something changed
        if was_modified:
            item.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(item)

        # Broadcast update via WebSocket if something changed
        if was_modified and broadcast:
            try:
                from app.services.websocket import websocket_manager

                # Get project_id from job
                project_id = get_project_id_from_job(db, item.job_id)
                if project_id:
                    await websocket_manager.broadcast_boq_update(
                        project_id=project_id,
                        item_id=item_id,
                        updates=updates,
                        user_id=user.id
                    )
            except Exception as e:
                # Don't fail the update if broadcast fails
                logger.error(f"Failed to broadcast BoQ update: {e}")

        return item, was_modified

    @staticmethod
    async def bulk_update_boq_items(
        db: Session,
        updates: List[Dict[str, Any]],
        user: User
    ) -> Dict[str, Any]:
        """
        Bulk update multiple BoQ items.

        Args:
            db: Database session
            updates: List of update dictionaries, each must have 'id' field
            user: Current user (for ownership check)

        Returns:
            Dictionary with summary:
            {
                "total": int,
                "updated": int,
                "skipped": int,
                "errors": List[Dict],
                "items": List[BoqItem]
            }
        """
        summary = {
            "total": len(updates),
            "updated": 0,
            "skipped": 0,
            "errors": [],
            "items": []
        }

        for update_data in updates:
            item_id = update_data.get("id")
            if not item_id:
                summary["errors"].append({
                    "item_id": None,
                    "error": "Missing 'id' field"
                })
                summary["skipped"] += 1
                continue

            try:
                # Create a copy without the id field
                updates_without_id = {k: v for k, v in update_data.items() if k != "id"}

                # Update item (with concurrency check, but no broadcast per-item)
                item, was_modified = await BoqService.update_boq_item(
                    db=db,
                    item_id=item_id,
                    updates=updates_without_id,
                    user=user,
                    check_concurrency=True,
                    broadcast=False  # Don't broadcast per-item, will broadcast batch
                )

                if was_modified:
                    summary["updated"] += 1
                else:
                    summary["skipped"] += 1

                summary["items"].append(item)

            except BoqValidationError as e:
                summary["errors"].append({
                    "item_id": item_id,
                    "field": e.field,
                    "error": e.message
                })
                summary["skipped"] += 1
                logger.warning(f"Validation error for item {item_id}: {e.message}")

            except BoqConcurrencyError as e:
                summary["errors"].append({
                    "item_id": item_id,
                    "error": "Concurrency conflict - item was modified by another user",
                    "expected_version": e.expected_version,
                    "actual_version": e.actual_version
                })
                summary["skipped"] += 1
                logger.warning(f"Concurrency error for item {item_id}")

            except Exception as e:
                summary["errors"].append({
                    "item_id": item_id,
                    "error": str(e)
                })
                summary["skipped"] += 1
                logger.error(f"Error updating item {item_id}: {e}")

        # Broadcast bulk update summary via WebSocket
        if summary["updated"] > 0:
            try:
                from app.services.websocket import websocket_manager

                # Get project_id from first updated item
                if summary["items"]:
                    first_item = summary["items"][0]
                    project_id = get_project_id_from_job(db, first_item.job_id)
                    if project_id:
                        # Broadcast bulk update event
                        await websocket_manager.sio.emit('boq:bulk:updated', {
                            'project_id': project_id,
                            'summary': {
                                'total': summary['total'],
                                'updated': summary['updated'],
                                'skipped': summary['skipped']
                            },
                            'updated_by': user.id
                        }, room=f"project:{project_id}")
            except Exception as e:
                logger.error(f"Failed to broadcast bulk update: {e}")

        return summary

    @staticmethod
    def validate_boq_integrity(db: Session, job_id: str, user: User) -> Dict[str, Any]:
        """
        Validate integrity of all BoQ items for a job.

        Checks:
        - Missing required fields
        - Invalid numeric values (negative, NaN)
        - Total price calculations
        - Duplicate codes

        Returns:
            Dictionary with validation report:
            {
                "valid": bool,
                "total_items": int,
                "errors": List[Dict],
                "warnings": List[Dict]
            }
        """
        from fastapi import HTTPException

        # Verify ownership
        job = db.query(Job).filter(Job.id == job_id, Job.user_id == user.id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        items = db.query(BoqItem).filter(BoqItem.job_id == job_id).all()

        report = {
            "valid": True,
            "total_items": len(items),
            "errors": [],
            "warnings": []
        }

        seen_codes = {}

        for item in items:
            # Check required fields
            if not item.description:
                report["errors"].append({
                    "item_id": item.id,
                    "field": "description",
                    "message": "Description is required"
                })
                report["valid"] = False

            if not item.unit:
                report["errors"].append({
                    "item_id": item.id,
                    "field": "unit",
                    "message": "Unit is required"
                })
                report["valid"] = False

            # Check numeric values
            if item.qty < 0:
                report["errors"].append({
                    "item_id": item.id,
                    "field": "qty",
                    "message": f"Negative quantity: {item.qty}"
                })
                report["valid"] = False

            if item.unit_price < 0:
                report["errors"].append({
                    "item_id": item.id,
                    "field": "unit_price",
                    "message": f"Negative unit price: {item.unit_price}"
                })
                report["valid"] = False

            # Check total price calculation
            expected_total = item.qty * item.unit_price
            if abs(item.total_price - expected_total) > 0.01:  # Allow 1 penny tolerance
                report["warnings"].append({
                    "item_id": item.id,
                    "field": "total_price",
                    "message": f"Total price mismatch: expected {expected_total:.2f}, got {item.total_price:.2f}"
                })

            # Check for duplicate codes
            if item.code:
                if item.code in seen_codes:
                    report["warnings"].append({
                        "item_id": item.id,
                        "field": "code",
                        "message": f"Duplicate code '{item.code}' (also in item {seen_codes[item.code]})"
                    })
                else:
                    seen_codes[item.code] = item.id

        return report


# Singleton instance
boq_service = BoqService()
