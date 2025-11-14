from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
import asyncio
from datetime import datetime, timezone

from app.api.deps import current_user
from app.db.session import get_db
from app.models.job import Job
from app.models.artifact import Artifact
from app.models.user import User
from app.schemas.artifact import ArtifactOut
from app.services.exports import export_csv, export_xlsx, export_pdf
from app.services.sse import broker
from sse_starlette.sse import EventSourceResponse

router = APIRouter()


@router.post("/{id}/export", response_model=ArtifactOut)
async def export_boq(
    id: str,
    format: str = "csv",
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """Export BOQ with real-time progress events - ownership verified"""
    # CRITICAL: Verify job ownership before export
    j = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")

    # Publish export started event
    try:
        await broker.publish(f"jobs:{id}:exports", {
            "type": "export.started",
            "format": format,
            "job_id": id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except RuntimeError:
        pass  # No event loop running (sync context)

    # Perform export
    if format == "csv":
        art = export_csv(db, id)
    elif format == "xlsx":
        art = export_xlsx(db, id)
    elif format == "pdf":
        art = export_pdf(db, id)
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

    # Publish export completed event
    try:
        await broker.publish(f"jobs:{id}:exports", {
            "type": "export.completed",
            "format": format,
            "job_id": id,
            "artifact_id": art.id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except RuntimeError:
        pass  # No event loop running

    return art


@router.get("/{id}/exports/stream")
async def stream_export_events(
    id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events stream for export progress.

    Streams real-time export status updates (started, completed, failed).
    Requires job ownership.
    """
    # CRITICAL: Verify job ownership
    j = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        """Generate SSE events from broker"""
        async for data in broker.subscribe(f"jobs:{id}:exports"):
            yield {"event": "message", "data": json.dumps(data)}

    response = EventSourceResponse(event_generator())
    # Security headers to prevent token leakage
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response


@router.get("/{id}/artifacts", response_model=List[ArtifactOut])
def list_artifacts(id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    """List artifacts for a job - ownership verified"""
    # CRITICAL: Verify job ownership first
    j = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")

    return db.query(Artifact).filter(Artifact.job_id == id).all()
