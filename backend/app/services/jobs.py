import time
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.job import Job
from app.models.job_event import JobEvent
from app.models.boq_item import BoqItem
from app.models.file import File
from app.services.sse import broker
from app.services.takeoff.ifc_validator import validate_ifc
from app.services.takeoff.ifc_takeoff import run_ifc_takeoff
from app.services.takeoff.dwg_takeoff import run_dwg_takeoff


def _emit(
    db: Session,
    job_id: str,
    stage: str,
    message: str,
    details: Optional[str] = None,
    progress: Optional[int] = None,
) -> None:
    ev = JobEvent(job_id=job_id, stage=stage, message=message, details=details)
    db.add(ev)
    if progress is not None:
        job = db.query(Job).get(job_id)
        if job:
            job.progress = progress
    db.commit()
    # SSE push
    asyncio.create_task(broker.publish(f"job:{job_id}", {"stage": stage, "message": message, "details": details}))


def process_job(job_id: str) -> None:
    """
    Background pipeline: Validation -> Parsing -> Take-off -> Save BoQ items.
    """
    db = SessionLocal()
    try:
        job = db.query(Job).get(job_id)
        if not job:
            return
        file = db.query(File).get(job.file_id)
        if not file:
            return
        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        _emit(db, job_id, "queued", "Job queued", progress=5)
        time.sleep(0.1)

        # Validation
        _emit(db, job_id, "validating", "Validating model...", progress=15)
        valid, warnings = (True, [])
        if file.type.upper() == "IFC":
            valid, warnings = validate_ifc(file_path=f"storage/uploads/{file.id}")
        time.sleep(0.1)
        if not valid:
            job.status = "failed"
            job.error_code = "validation_error"
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
            _emit(db, job_id, "error", "Validation failed")
            return
        if warnings:
            _emit(db, job_id, "warnings", "; ".join(warnings))

        # Parsing / Take-off
        _emit(db, job_id, "parsing", "Parsing model...", progress=30)
        time.sleep(0.1)
        _emit(db, job_id, "takeoff", "Generating quantities...", progress=60)
        time.sleep(0.1)

        items: List[Dict] = []
        if file.type.upper() == "IFC":
            items = run_ifc_takeoff(f"storage/uploads/{file.id}")
        else:
            items = run_dwg_takeoff(f"storage/uploads/{file.id}")

        # Persist BoQ items
        for it in items:
            db.add(BoqItem(job_id=job_id, **it))
        db.commit()
        _emit(db, job_id, "complete", "Take-off ready", progress=85)

        # Finish
        job.status = "completed"
        job.progress = 100
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        _emit(db, job_id, "completed", "Job finished", progress=100)
    finally:
        db.close()
