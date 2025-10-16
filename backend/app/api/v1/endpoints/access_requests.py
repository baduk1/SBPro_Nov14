from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.access_request import AccessRequest
from app.schemas.access_request import AccessRequestCreate, AccessRequestOut

router = APIRouter()


@router.post("/access-requests", response_model=AccessRequestOut)
def create_access_request(payload: AccessRequestCreate, db: Session = Depends(get_db)):
    r = AccessRequest(**payload.dict())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


