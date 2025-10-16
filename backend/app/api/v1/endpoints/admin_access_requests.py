from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.access_request import AccessRequest
from app.schemas.access_request import AccessRequestOut, AccessRequestUpdate


router = APIRouter(
    prefix="/access-requests",
    tags=["Admin: Access Requests"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=List[AccessRequestOut])
def list_access_requests(db: Session = Depends(get_db)):
    return db.query(AccessRequest).order_by(AccessRequest.created_at.desc()).all()


@router.patch("/{request_id}", response_model=AccessRequestOut)
def update_access_request(request_id: str, payload: AccessRequestUpdate, db: Session = Depends(get_db)):
    ar = db.query(AccessRequest).get(request_id)
    if not ar:
        raise HTTPException(status_code=404, detail="Access request not found")

    if payload.status is not None:
        ar.status = payload.status

    db.commit()
    db.refresh(ar)
    return ar
