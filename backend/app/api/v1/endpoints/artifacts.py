from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.artifact import Artifact

router = APIRouter()


@router.get("/{id}/download")
def download_artifact(id: str, db: Session = Depends(get_db)):
    a = db.query(Artifact).get(id)
    if not a:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return FileResponse(a.path, filename=a.path.split("/")[-1])
