import time
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Optional

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.job import Job
from app.models.job_event import JobEvent
from app.models.boq_item import BoqItem
from app.models.file import File
from app.models.user import User
from app.services.sse import broker
from app.services.takeoff.ifc_validator import validate_ifc
from app.services.storage import mapping_file_path
from app.services.takeoff.ifc_takeoff import run_ifc_takeoff
from app.services.takeoff.dwg_takeoff import run_dwg_takeoff
from app.services.pricing import apply_prices as apply_prices_service
from app.models.price_list import PriceList
from app.core.config import settings


def _refund_credits(db: Session, job: Job) -> None:
    """
    Refund credits to user when job processing fails.
    CRITICAL: This ensures users don't lose credits on processing failures.
    """
    try:
        user = db.query(User).filter(User.id == job.user_id).first()
        if user:
            user.credits_balance += settings.COST_PER_JOB
            db.commit()
            _emit(db, job.id, "refund", f"Credits refunded ({settings.COST_PER_JOB} credits)", progress=None)
    except Exception as e:
        # Log refund failure but don't crash
        _emit(db, job.id, "error", f"Credit refund failed: {e}", progress=None)

# Engines
try:
    from app.services.takeoff.planpdf import run_planpdf_takeoff  # PDF plan engine (rus/eng)
except Exception:
    run_planpdf_takeoff = None  # type: ignore


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
    # SSE push - schedule publish safely whether we're in an asyncio event loop or running in a thread
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is not None:
        # We're in an asyncio event loop — schedule coroutine
        loop.create_task(broker.publish(f"job:{job_id}", {"stage": stage, "message": message, "details": details}))
    else:
        # No running loop in this thread (likely running in background thread). Try to schedule
        # on the main event loop if available, otherwise start a short-lived thread with its own loop.
        try:
            main_loop = asyncio.get_event_loop()
            asyncio.run_coroutine_threadsafe(
                broker.publish(f"job:{job_id}", {"stage": stage, "message": message, "details": details}),
                main_loop,
            )
        except Exception:
            # Fallback: publish in a daemon thread with its own event loop
            import threading

            def _run_pub():
                import asyncio as _asyncio
                _asyncio.run(broker.publish(f"job:{job_id}", {"stage": stage, "message": message, "details": details}))

            threading.Thread(target=_run_pub, daemon=True).start()


def process_job(job_id: str) -> None:
    """
    Background pipeline: Validation -> Parsing -> Take-off -> Save BoQ items.
    Credits are refunded on any failure.
    """
    db = SessionLocal()
    job = None
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
            # CRITICAL: Refund credits on validation failure
            _refund_credits(db, job)
            return
        if warnings:
            _emit(db, job_id, "warnings", "; ".join(warnings))

        # Parsing / Take-off
        _emit(db, job_id, "parsing", "Parsing model...", progress=30)
        time.sleep(0.1)
        _emit(db, job_id, "takeoff", "Generating quantities...", progress=60)
        time.sleep(0.1)

        items: List[Dict] = []
        upload_path = f"storage/uploads/{file.id}"
        ftype = (file.type or "").upper()
        try:
            if ftype == "IFC":
                map_path = mapping_file_path()
                items = run_ifc_takeoff(upload_path, mapping_path=map_path, price_path=None)

            elif ftype in {"DWG", "DXF"}:
                from app.models.mapping import DwgLayerMap

                db_map = db.query(DwgLayerMap).all()
                layer_map = {}
                for m in db_map:
                    layer_map[m.layer_name] = {
                        "code": m.default_code,
                        "description": m.element_type,
                        "unit": m.default_unit or "m",
                    }
                mapping = {"layers": layer_map, "blocks": {}}
                items = run_dwg_takeoff(upload_path, mapping=mapping, units=None)

            elif ftype == "PDF" and settings.ENABLE_PDF_PLAN_ENGINE and run_planpdf_takeoff:
                items = run_planpdf_takeoff(upload_path)
            else:
                raise RuntimeError(f"Unsupported file type for take-off: {ftype}")
        except Exception as e:
            job.status = "failed"
            job.error_code = "takeoff_error"
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
            _emit(db, job_id, "error", f"Take-off failed: {e}")
            # CRITICAL: Refund credits on takeoff failure
            _refund_credits(db, job)
            return

        # Persist BoQ items
        for it in items:
            db.add(BoqItem(job_id=job_id, **it))
        db.commit()
        _emit(db, job_id, "complete", "Take-off ready", progress=85)

        # Auto-apply pricing when possible
        try:
            if not job.price_list_id:
                pl = (
                    db.query(PriceList)
                    .filter(PriceList.is_active == True)  # noqa: E712
                    .order_by(PriceList.created_at.desc())
                    .first()
                )
                if pl:
                    job.price_list_id = pl.id
                    db.commit()
            if job.price_list_id:
                apply_prices_service(db, job_id, job.price_list_id)
                _emit(db, job_id, "pricing", "Prices applied", progress=90)
        except Exception as price_err:  # pragma: no cover - pricing failures are non-fatal
            _emit(db, job_id, "pricing", f"Pricing skipped: {price_err}")

        # Finish
        job.status = "COMPLETED"
        job.progress = 100
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        _emit(db, job_id, "completed", "Job finished", progress=100)
    except Exception as e:
        # CRITICAL: Catch any unexpected errors and refund credits
        if job:
            try:
                job.status = "failed"
                job.error_code = "unexpected_error"
                job.finished_at = datetime.now(timezone.utc)
                db.commit()
                _emit(db, job_id, "error", f"Unexpected error: {e}")
                _refund_credits(db, job)
            except:
                pass  # Best effort refund
    finally:
        db.close()
