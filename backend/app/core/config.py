from functools import lru_cache
from typing import List, Optional
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Environment
    ENV: str = os.getenv("ENV", "development")  # development | production

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")  # must be set in env for staging/prod
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))

    # CORS
    USER_APP_ORIGIN: Optional[str] = os.getenv("USER_APP_ORIGIN")
    ADMIN_APP_ORIGIN: Optional[str] = os.getenv("ADMIN_APP_ORIGIN")
    
    # ✅ Localhost origins only in development mode
    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        """Return CORS origins based on environment"""
        if self.ENV == "production":
            # Production: no localhost origins
            return []
        else:
            # Development: localhost for frontend dev servers
            return [
                "http://localhost:5173",      # User frontend (Vite)
                "http://127.0.0.1:5173",
                "http://localhost:5174",      # Admin frontend (Vite)
                "http://127.0.0.1:5174",
                "http://localhost",
            ]

    # Database & storage
    DB_URL: str = os.getenv("DB_URL", "sqlite:///./boq.db")
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./storage")
    DEFAULT_CURRENCY: str = os.getenv("DEFAULT_CURRENCY", "GBP")
    DEFAULT_REGION: str = os.getenv("DEFAULT_REGION", "UK")

    # Presign/HMAC
    PRESIGN_DEFAULT_TTL_SECONDS: int = int(os.getenv("PRESIGN_DEFAULT_TTL_SECONDS", "900"))  # 15 min
    PRESIGN_CLOCK_SKEW_SECONDS: int = int(os.getenv("PRESIGN_CLOCK_SKEW_SECONDS", "30"))

    # Engines & mapping
    MAPPING_FILE: str = os.getenv("MAPPING_FILE", "storage/config/mapping.yml")
    ENABLE_PDF_PLAN_ENGINE: bool = os.getenv("ENABLE_PDF_PLAN_ENGINE", "true").lower() == "true"
    OCR_LANGS: str = os.getenv("OCR_LANGS", "rus+eng")

    # Backups
    BACKUP_DIR: str = os.getenv("BACKUP_DIR", "./backups")

    # Upload whitelist
    ALLOWED_UPLOAD_TYPES: List[str] = ["IFC", "DWG", "DXF", "PDF"]

    # Credits & Billing
    COST_PER_JOB: int = int(os.getenv("COST_PER_JOB", "200"))  # Credits to deduct per job

    # Email Configuration
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@skybuild.io")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "SkyBuild Pro")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()
