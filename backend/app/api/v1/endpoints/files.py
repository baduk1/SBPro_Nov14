from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
import os

from app.db.session import get_db
from app.models.file import File
from app.schemas.file import FileOut, PresignedUpload
from app.services.storage import uploads_path

router = APIRouter()


@router.post("", response_model=PresignedUpload)
def create_presigned(project_id: str, filename: str, ftype: str, db: Session = Depends(get_db)):
    f = File(project_id=project_id, user_id="seed-owner", filename=filename, type=ftype)
    db.add(f)
    db.commit()
    db.refresh(f)
    return PresignedUpload(file_id=f.id, upload_url=f"/api/v1/files/{f.id}/content")


@router.put("/{file_id}/content")
async def upload_content(file_id: str, request: Request, db: Session = Depends(get_db)):
    f = db.query(File).get(file_id)
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    dest = uploads_path(file_id)
    body = await request.body()
    with open(dest, "wb") as out:
        out.write(body)
    f.size = os.path.getsize(dest)
    db.commit()
    return {"uploaded": True, "size": f.size}


@router.get("/{file_id}", response_model=FileOut)
def get_file(file_id: str, db: Session = Depends(get_db)):
    f = db.query(File).get(file_id)
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return f
