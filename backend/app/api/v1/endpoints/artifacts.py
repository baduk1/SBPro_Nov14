from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.session import get_db
from app.models.artifact import Artifact
from app.models.job import Job
from app.services.storage import generate_presigned_url, verify_presigned

router = APIRouter()


@router.post("/{id}/presign")
def presign_download(id: str, ttl_seconds: Optional[int] = None, user=Depends(current_user), db: Session = Depends(get_db)):
    """Generate presigned download URL - ownership verified via job"""
    # CRITICAL: Verify artifact ownership through job ownership
    a = db.query(Artifact).join(Job, Artifact.job_id == Job.id)\
        .filter(Artifact.id == id, Job.user_id == user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Artifact not found")
    # Return presigned download URL
    path = f"/api/v1/artifacts/{id}/download"
    return {"url": generate_presigned_url(path, action="download", subject_id=id, ttl_seconds=ttl_seconds)}


@router.get("/{id}/download")
def download_artifact(id: str, act: str = Query(...), exp: int = Query(...), sig: str = Query(...), db: Session = Depends(get_db)):
    """Download artifact - presigned URL validated (ownership checked at presign time)"""
    if act != "download":
        raise HTTPException(status_code=400, detail="Invalid action")

    # Verify presigned signature first
    try:
        verify_presigned("download", id, exp, sig)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    # Get artifact (signature already validated ownership at presign time)
    a = db.query(Artifact).get(id)
    if not a:
        raise HTTPException(status_code=404, detail="Artifact not found")
    filename = a.path.split("/")[-1]
    return FileResponse(a.path, filename=filename)
