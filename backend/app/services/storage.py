import os
from pathlib import Path
from typing import Tuple
from app.core.config import settings

UPLOADS_DIR = Path(settings.STORAGE_DIR) / "uploads"
ARTIFACTS_DIR = Path(settings.STORAGE_DIR) / "artifacts"


def ensure_dirs() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


def uploads_path(file_id: str) -> str:
    ensure_dirs()
    return str(UPLOADS_DIR / file_id)


def artifacts_path(job_id: str, filename: str) -> str:
    ensure_dirs()
    return str(ARTIFACTS_DIR / f"{job_id}_{filename}")
