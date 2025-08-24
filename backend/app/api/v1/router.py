from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    projects,
    files,
    jobs,
    takeoff,
    pricing,
    export,
    artifacts,
    admin_price,
    admin_mapping,
    access_requests,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(files.router, prefix="/files", tags=["Files"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(takeoff.router, prefix="/jobs", tags=["Take-off/BoQ"])
api_router.include_router(pricing.router, prefix="/jobs", tags=["Pricing"])
api_router.include_router(export.router, prefix="/jobs", tags=["Export/Artifacts"])
api_router.include_router(artifacts.router, prefix="/artifacts", tags=["Artifacts"])
api_router.include_router(admin_price.router, prefix="/admin", tags=["Admin: Price Lists"])
api_router.include_router(admin_mapping.router, prefix="/mappings", tags=["Admin: Mappings"])
api_router.include_router(access_requests.router, prefix="/public", tags=["Public"])
