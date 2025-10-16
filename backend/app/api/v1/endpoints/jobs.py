import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from app.api.deps import current_user
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
    f = db.query(File).get(payload.file_id)
    if not f:
        raise HTTPException(status_code=400, detail="Invalid file")
    # pick active price list if not provided
    price_list_id = payload.price_list_id
    if not price_list_id:
        pl = db.query(PriceList).filter(PriceList.is_active == True).order_by(PriceList.effective_from.desc().nullslast()).first()  # noqa: E712
        price_list_id = pl.id if pl else None
    j = Job(
        project_id=payload.project_id,
        user_id=user.id,
        file_id=payload.file_id,
        status="queued",
        progress=0,
        price_list_id=price_list_id,
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    background.add_task(process_job, j.id)
    return j


@router.get("", response_model=list[JobOut])
def list_jobs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(Job).order_by(Job.created_at.desc()).all()


@router.get("/{id}", response_model=JobOut)
def get_job(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    j = db.query(Job).get(id)
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return j


@router.get("/{id}/events", response_model=list[JobEventOut])
def get_events(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(JobEvent).filter(JobEvent.job_id == id).order_by(JobEvent.ts.asc()).all()


@router.get("/{id}/stream")
async def stream(id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    async def event_generator():
        events = db.query(JobEvent).filter(JobEvent.job_id == id).order_by(JobEvent.ts.asc()).all()
        for e in events:
            yield {"event": "message", "data": json.dumps({"stage": e.stage, "message": e.message, "ts": str(e.ts)})}
        async for data in broker.subscribe(f"job:{id}"):
            yield {"event": "message", "data": json.dumps(data)}

    return EventSourceResponse(event_generator())
