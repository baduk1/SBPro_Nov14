import os, time, hmac, hashlib, base64
from pathlib import Path
from typing import Tuple
from app.core.config import settings

UPLOADS_DIR = Path(settings.STORAGE_DIR) / "uploads"
ARTIFACTS_DIR = Path(settings.STORAGE_DIR) / "artifacts"
CONFIG_DIR = Path(settings.STORAGE_DIR) / "config"


def ensure_dirs() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def uploads_path(file_id: str) -> str:
    ensure_dirs()
    return str(UPLOADS_DIR / file_id)


def artifacts_path(job_id: str, filename: str) -> str:
    ensure_dirs()
    return str(ARTIFACTS_DIR / f"{job_id}_{filename}")


def _b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("utf-8").rstrip("=")


def _sign(action: str, subject_id: str, exp: int) -> str:
    msg = f"{action}:{subject_id}:{exp}".encode("utf-8")
    key = settings.SECRET_KEY.encode("utf-8")
    return _b64url(hmac.new(key, msg, hashlib.sha256).digest())


def generate_presigned_url(path: str, action: str, subject_id: str, ttl_seconds: int | None = None) -> str:
    """
    Build presigned URL for upload/download actions.
    path: API-relative path (e.g. f"/api/v1/files/{id}/content")
    """
    ensure_dirs()
    ttl = int(ttl_seconds or settings.PRESIGN_DEFAULT_TTL_SECONDS)
    exp = int(time.time()) + ttl
    sig = _sign(action, subject_id, exp)
    return f"{path}?act={action}&exp={exp}&sig={sig}"


def verify_presigned(action: str, subject_id: str, exp: int, sig: str) -> None:
    now = int(time.time())
    if exp + settings.PRESIGN_CLOCK_SKEW_SECONDS < now:
        raise PermissionError("Presigned URL expired")
    expected = _sign(action, subject_id, exp)
    if not hmac.compare_digest(expected, sig):
        raise PermissionError("Invalid signature")


def mapping_file_path() -> str:
    """
    Resolve mapping file for boq_engine_v1.
    Priority:
      1) env MAPPING_FILE (if it exists)
      2) storage/config/mapping.yml (if exists)
      3) fallback to repo example
    """
    ensure_dirs()
    p_env = Path(settings.MAPPING_FILE)
    if p_env.exists():
        return str(p_env)
    p_store = CONFIG_DIR / "mapping.yml"
    if p_store.exists():
        return str(p_store)
    # fallback inside repo (works in dev)
    fallback = Path(__file__).resolve().parents[2] / "boq_engine_v1" / "config" / "mapping.example.yml"
    return str(fallback)
