from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import Optional
import os

from app.api.deps import current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.file import File
from app.models.project import Project
from app.models.user import User
from app.schemas.file import FileOut, PresignedUpload, PresignUploadRequest
from app.services.storage import uploads_path, generate_presigned_url, verify_presigned

router = APIRouter()


@router.post("", response_model=PresignedUpload)
def create_presigned(
    payload: PresignUploadRequest,
    ttl_seconds: Optional[int] = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    # SECURITY: Verify project ownership before allowing file upload
    project = db.query(Project).filter(
        Project.id == payload.project_id,
        Project.owner_id == user.id
    ).first()
    if not project:
        raise HTTPException(status_code=403, detail="Project not found or access denied")
    
    ftype_u = (payload.file_type or "").upper()
    if ftype_u not in settings.ALLOWED_UPLOAD_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {payload.file_type}")
    
    f = File(project_id=payload.project_id, user_id=user.id, filename=payload.filename, type=ftype_u)
    db.add(f)
    db.commit()
    db.refresh(f)
    upload_path = f"{settings.API_V1_PREFIX}/files/{f.id}/content"
    url = generate_presigned_url(upload_path, action="upload", subject_id=f.id, ttl_seconds=ttl_seconds)
    headers = {"Content-Type": payload.content_type or "application/octet-stream"}
    return PresignedUpload(file_id=f.id, upload_url=url, headers=headers)


@router.put("/{file_id}/content")
async def upload_content(
    file_id: str,
    request: Request,
    act: str = Query(..., description="Action token must be 'upload'"),
    exp: int = Query(..., description="Unix timestamp (expiry)"),
    sig: str = Query(..., description="HMAC-SHA256 signature"),
    db: Session = Depends(get_db),
):
    if act != "upload":
        raise HTTPException(status_code=400, detail="Invalid action")
    f = db.query(File).get(file_id)
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        verify_presigned("upload", file_id, exp, sig)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    
    # ✅ Read body with size limit (100 MB)
    MAX_SIZE = 100 * 1024 * 1024  # 100 MB
    dest = uploads_path(file_id)
    body = await request.body()
    
    # ✅ Check file size
    if len(body) > MAX_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is 100 MB.")
    
    if len(body) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    
    # ✅ Validate magic bytes based on file type
    file_type = f.type.upper()
    magic_valid = True
    error_msg = ""
    
    if file_type == "PDF":
        # PDF files start with %PDF-
        if not body.startswith(b'%PDF-'):
            magic_valid = False
            error_msg = "Invalid PDF file: missing PDF header"
    
    elif file_type == "IFC":
        # IFC files start with ISO-10303-21
        if not body.startswith(b'ISO-10303-21'):
            magic_valid = False
            error_msg = "Invalid IFC file: missing ISO-10303-21 header"
    
    elif file_type == "DWG":
        # DWG files start with AC followed by version (e.g., AC1027, AC1032)
        if not body.startswith(b'AC'):
            magic_valid = False
            error_msg = "Invalid DWG file: missing AC header"
    
    if not magic_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Write file
    with open(dest, "wb") as out:
        out.write(body)
    
    f.size = os.path.getsize(dest)
    db.commit()
    return {"uploaded": True, "size": f.size}


@router.get("/{file_id}", response_model=FileOut)
def get_file(file_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get file metadata - ownership verified"""
    f = db.query(File).filter(File.id == file_id, File.user_id == user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return f
