from functools import lru_cache
from typing import List
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "CHANGE_ME_SUPER_SECRET"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost",
    ]

    # Database & storage
    DB_URL: str = os.getenv("DB_URL", "sqlite:///./boq.db")
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./storage")
    DEFAULT_CURRENCY: str = os.getenv("DEFAULT_CURRENCY", "GBP")
    DEFAULT_REGION: str = os.getenv("DEFAULT_REGION", "UK")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()
