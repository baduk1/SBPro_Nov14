# Reusable Modules

This directory contains **plug-and-play modules** that can be used in SkyBuild Pro or extracted for use in other projects.

## Available Modules

### 1. `collaboration/` ✅ Complete

Multi-user collaboration features:
- Role-based access control (Owner/Editor/Viewer)
- Email invitations with secure tokens
- Comments system (with threading)
- Activity logging
- In-app notifications

**Status**: Production-ready
**Dependencies**: FastAPI, SQLAlchemy, Alembic, Pydantic
**Documentation**: `/COLLABORATION_MODULE_USAGE.md`

### 2. `realtime/` (Coming in Phase 2)

WebSocket-based real-time features:
- Live presence (who's online)
- Live cursors and selections
- Real-time broadcasts
- Event pub/sub via Redis

**Status**: Planned

### 3. `tasks/` (Coming in Phase 2)

Project management features:
- Tasks CRUD
- Kanban board support
- Timeline/Gantt view support
- Task assignments and due dates

**Status**: Planned

### 4. `notifications/` (Integrated in collaboration)

Notification system (already part of collaboration module):
- In-app notifications
- Email notifications (Phase 1.5)
- Notification preferences

**Status**: Basic version complete

### 5. `integrations/notion/` (Coming in Phase 2)

Notion integration:
- OAuth 2.0 connection
- One-way sync (Phase 2)
- Two-way sync (Phase 3)
- Webhook receiver

**Status**: Planned

## Design Principles

All modules follow these principles:

1. **Configuration-Driven**: Easy to customize via config objects
2. **Pluggable**: Can be mounted as FastAPI routers
3. **Self-Contained**: Minimal dependencies on parent app
4. **Database Agnostic**: Work with SQLite (dev) and PostgreSQL (prod)
5. **Well-Documented**: Clear docs for integration

## Quick Start

### Use a Module in Your Project

```python
# 1. Copy the module
cp -r backend/app/modules/collaboration/ your_project/app/modules/

# 2. Import and configure
from app.modules.collaboration import create_collaboration_router, CollaborationConfig

config = CollaborationConfig(
    context_types=["project", "deal", "task"],  # Customize!
    available_roles=["owner", "editor", "viewer"]
)

router = create_collaboration_router(config)

# 3. Mount to your app
app.include_router(router, prefix="/api/v1")

# 4. Run migrations
alembic revision --autogenerate -m "Add collaboration"
alembic upgrade head
```

### Test the Module

```bash
# Start the API
cd backend
source env/bin/activate
uvicorn app.main:app --reload

# Visit API docs
open http://localhost:8000/api/v1/docs

# Test endpoints
curl -X GET http://localhost:8000/api/v1/projects/{id}/collaborators \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Module Structure

Each module follows this structure:

```
module_name/
├── __init__.py      # Public exports
├── config.py        # Configuration class
├── models.py        # SQLAlchemy models
├── schemas.py       # Pydantic schemas
├── service.py       # Business logic
├── router.py        # FastAPI endpoints
└── README.md        # Module-specific docs
```

## Creating New Modules

To create a new reusable module:

1. Create folder in `app/modules/your_module/`
2. Follow the structure above
3. Make it configuration-driven
4. Keep dependencies minimal
5. Write clear documentation
6. Add tests in `tests/modules/test_your_module.py`

Example:

```python
# app/modules/your_module/config.py
from pydantic import BaseModel

class YourModuleConfig(BaseModel):
    enable_feature_x: bool = True
    max_items: int = 100

# app/modules/your_module/router.py
def create_your_module_router(config: YourModuleConfig):
    router = APIRouter()

    @router.get("/items")
    def list_items():
        # Use config.max_items here
        pass

    return router
```

## Contributing

When adding modules:
- Follow existing patterns
- Add comprehensive docstrings
- Include usage examples
- Write tests
- Update this README

## License

Part of SkyBuild Pro. Can be extracted and reused under project license.
