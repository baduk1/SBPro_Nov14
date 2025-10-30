from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.v1.router import api_router
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.error_handler import register_error_handlers

# Import reusable modules
from app.modules.collaboration import collaboration_router
from app.modules.tasks import tasks_router

# Import WebSocket manager
from app.services.websocket import websocket_manager

logger = logging.getLogger(__name__)

# Fail fast: SECRET_KEY must be set for staging/prod (and dev, если хочешь дисциплины)
if not settings.SECRET_KEY or settings.SECRET_KEY.strip() in ("", "CHANGE_ME_SUPER_SECRET"):
    raise RuntimeError("SECRET_KEY must be set via env. Month-2 production foundation requires secure secrets.")

# Create DB schema (dev only). In production, use migration scripts.
if settings.ENV != "production":
    Base.metadata.create_all(bind=engine)
else:
    # Production: migrations must be run manually
    # Run: python migrate_add_registration.py && python migrate_add_templates_estimates.py
    pass

app = FastAPI(
    title="SkyBuild Pro API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
)

cors_origins = list(dict.fromkeys(settings.BACKEND_CORS_ORIGINS))
if settings.USER_APP_ORIGIN:
    cors_origins.append(settings.USER_APP_ORIGIN)
if settings.ADMIN_APP_ORIGIN:
    cors_origins.append(settings.ADMIN_APP_ORIGIN)
cors_origins = list(dict.fromkeys(cors_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting (100 requests per minute per IP)
app.add_middleware(RateLimitMiddleware, calls=100, period=60)

# Register error handlers
register_error_handlers(app)

# Mount API routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Mount reusable modules
app.include_router(collaboration_router, prefix=settings.API_V1_PREFIX, tags=["collaboration"])
app.include_router(tasks_router, prefix=settings.API_V1_PREFIX, tags=["tasks", "project-management"])

# Mount WebSocket server (Socket.IO)
# Accessible at: ws://localhost:8000/socket.io/
app.mount("/socket.io", websocket_manager.get_asgi_app())
logger.info("WebSocket server mounted at /socket.io")


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/ws/status")
def websocket_status():
    """Check WebSocket server status"""
    return {
        "enabled": True,
        "redis_enabled": settings.REDIS_ENABLED,
        "endpoint": "/socket.io",
        "active_connections": len(websocket_manager.connections),
        "active_project_rooms": len(websocket_manager.project_rooms)
    }
