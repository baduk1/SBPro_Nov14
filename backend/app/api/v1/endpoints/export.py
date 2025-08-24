from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.job import Job
from app.models.artifact import Artifact
from app.schemas.artifact import ArtifactOut
from app.services.exports import export_csv, export_xlsx, export_pdf

router = APIRouter()


@router.post("/{id}/export", response_model=ArtifactOut)
def export_boq(id: str, format: str = "csv", db: Session = Depends(get_db)):
    j = db.query(Job).get(id)
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    if format == "csv":
        art = export_csv(db, id)
    elif format == "xlsx":
        art = export_xlsx(db, id)
    elif format == "pdf":
        art = export_pdf(db, id)
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")
    return art


@router.get("/{id}/artifacts", response_model=List[ArtifactOut])
def list_artifacts(id: str, db: Session = Depends(get_db)):
    return db.query(Artifact).filter(Artifact.job_id == id).all()
