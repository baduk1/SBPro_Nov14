from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db.session import get_db
from app.models.artifact import Artifact
from app.services.storage import generate_presigned_url, verify_presigned

router = APIRouter()


@router.post("/{id}/presign")
def presign_download(id: str, ttl_seconds: int | None = None, user=Depends(current_user), db: Session = Depends(get_db)):
    a = db.query(Artifact).get(id)
    if not a:
        raise HTTPException(status_code=404, detail="Artifact not found")
    # Return presigned download URL
    path = f"/api/v1/artifacts/{id}/download"
    return {"url": generate_presigned_url(path, action="download", subject_id=id, ttl_seconds=ttl_seconds)}


@router.get("/{id}/download")
def download_artifact(id: str, act: str = Query(...), exp: int = Query(...), sig: str = Query(...), db: Session = Depends(get_db)):
    if act != "download":
        raise HTTPException(status_code=400, detail="Invalid action")
    a = db.query(Artifact).get(id)
    if not a:
        raise HTTPException(status_code=404, detail="Artifact not found")
    try:
        verify_presigned("download", id, exp, sig)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    filename = a.path.split("/")[-1]
    return FileResponse(a.path, filename=filename)
