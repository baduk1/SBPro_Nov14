import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session
from sqlalchemy import update

from app.api.deps import current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.job import Job
from app.models.job_event import JobEvent
from app.models.file import File
from app.models.price_list import PriceList
from app.models.user import User
from app.schemas.job import JobCreate, JobOut, JobEventOut
from app.services.jobs import process_job
from app.services.sse import broker

router = APIRouter()


@router.post("", response_model=JobOut)
def create_job(payload: JobCreate, background: BackgroundTasks, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Create a new processing job - credits are deducted"""
    # Check file exists and user owns it
    f = db.query(File).filter(File.id == payload.file_id, File.user_id == user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    job_cost = settings.COST_PER_JOB

    # ATOMIC credits deduction (works on SQLite AND Postgres, race-condition safe)
    # Use conditional UPDATE that only succeeds if credits >= cost
    stmt = (
        update(User)
        .where(User.id == user.id, User.credits_balance >= job_cost)
        .values(credits_balance=User.credits_balance - job_cost)
    )
    result = db.execute(stmt)
    
    # Check if update succeeded (rowcount == 1 means credits were deducted)
    if result.rowcount == 0:
        # Either user doesn't exist (shouldn't happen) or insufficient credits
        db.rollback()
        current_balance = db.query(User.credits_balance).filter(User.id == user.id).scalar()
        raise HTTPException(
            status_code=402,  # Payment Required
            detail=f"Insufficient credits. Required: {job_cost}, Available: {current_balance or 0}"
        )

    # pick active price list if not provided
    price_list_id = payload.price_list_id
    if not price_list_id:
        pl = db.query(PriceList).filter(PriceList.is_active == True).order_by(PriceList.effective_from.desc().nullslast()).first()  # noqa: E712
        price_list_id = pl.id if pl else None

    # Create job - credits already deducted atomically above
    j = Job(
        project_id=payload.project_id,
        user_id=user.id,
        file_id=payload.file_id,
        status="queued",
        progress=0,
        price_list_id=price_list_id,
    )
    db.add(j)

    try:
        # Commit job creation (credits already deducted)
        db.commit()
        db.refresh(j)
    except Exception as e:
        # Rollback on failure (will restore credits and not create job)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")

    # Queue background processing (refund will happen if processing fails)
    background.add_task(process_job, j.id)
    return j


@router.get("", response_model=list[JobOut])
def list_jobs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """List all jobs owned by the current user"""
    return db.query(Job).filter(Job.user_id == user.id).order_by(Job.created_at.desc()).all()


@router.get("/{id}", response_model=JobOut)
def get_job(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get a specific job - ownership verified"""
    j = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return j


@router.get("/{id}/events", response_model=list[JobEventOut])
def get_events(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get job events - ownership verified"""
    # Verify job ownership first
    j = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return db.query(JobEvent).filter(JobEvent.job_id == id).order_by(JobEvent.ts.asc()).all()


@router.get("/{id}/stream")
async def stream(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Stream job events via SSE - ownership verified"""
    # Verify job ownership first
    j = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        events = db.query(JobEvent).filter(JobEvent.job_id == id).order_by(JobEvent.ts.asc()).all()
        for e in events:
            yield {"event": "message", "data": json.dumps({"stage": e.stage, "message": e.message, "ts": str(e.ts)})}
        async for data in broker.subscribe(f"job:{id}"):
            yield {"event": "message", "data": json.dumps(data)}

    return EventSourceResponse(event_generator())
