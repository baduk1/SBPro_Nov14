# Collaboration Module - Usage Guide

## Overview

The Collaboration Module is a **fully reusable** multi-user collaboration system built for SkyBuild Pro, but designed to work with any project management or CRM application.

## Features

- **Role-Based Access Control (RBAC)**: Owner, Editor, Viewer roles with hierarchical permissions
- **Invitations**: Email-based invitations with secure tokens
- **Comments**: Threaded comments on any resource type
- **Activity Log**: Audit trail of all project changes
- **Notifications**: In-app notification system
- **100% Reusable**: Configuration-driven, works with any parent resource

## Installation

### Requirements

```bash
# Already in requirements.txt
fastapi>=0.111.0
SQLAlchemy>=2.0.31
alembic>=1.13.1
pydantic>=2.8.2
cryptography>=42.0.5
itsdangerous>=2.1.2
```

### Setup in SkyBuild Pro

The module is already integrated! Just run migrations:

```bash
cd backend
source env/bin/activate
alembic upgrade head
```

## API Usage

### 1. List Collaborators

```bash
GET /api/v1/projects/{project_id}/collaborators
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "project_id": "abc-123",
    "role": "owner",
    "user": {
      "id": "user-1",
      "email": "user@example.com",
      "full_name": "John Doe"
    },
    "invited_at": "2025-10-30T12:00:00Z",
    "accepted_at": "2025-10-30T12:05:00Z"
  }
]
```

### 2. Invite Collaborator

```bash
POST /api/v1/projects/{project_id}/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "colleague@example.com",
  "role": "editor",
  "expires_in_days": 7
}

Response:
{
  "id": 5,
  "project_id": "abc-123",
  "email": "colleague@example.com",
  "role": "editor",
  "status": "pending",
  "invited_at": "2025-10-30T12:00:00Z",
  "expires_at": "2025-11-06T12:00:00Z",
  "_token": "secure_token_here"  // Send this via email!
}
```

### 3. Accept Invitation

```bash
POST /api/v1/join-project
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "secure_token_from_email"
}

Response:
{
  "success": true,
  "project_id": "abc-123",
  "role": "editor"
}
```

### 4. Create Comment

```bash
POST /api/v1/projects/{project_id}/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "context_type": "boq",      // or "task", "project"
  "context_id": "item-123",
  "body": "Please review this quantity",
  "parent_id": null           // null for top-level, or comment_id for reply
}

Response:
{
  "id": 10,
  "project_id": "abc-123",
  "context_type": "boq",
  "context_id": "item-123",
  "body": "Please review this quantity",
  "author_id": "user-1",
  "author": {
    "id": "user-1",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "created_at": "2025-10-30T12:00:00Z"
}
```

### 5. Get Activity Log

```bash
GET /api/v1/projects/{project_id}/activities?limit=50
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "project_id": "abc-123",
    "actor_id": "user-1",
    "type": "member.added",
    "payload": {
      "user_id": "user-2",
      "role": "editor"
    },
    "created_at": "2025-10-30T12:00:00Z",
    "actor": {
      "id": "user-1",
      "email": "owner@example.com",
      "full_name": "Project Owner"
    }
  }
]
```

### 6. Get Notifications

```bash
GET /api/v1/notifications?unread_only=true
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "user_id": "user-1",
    "project_id": "abc-123",
    "type": "mention",
    "payload": {
      "comment_id": 10,
      "mentioned_by": "user-2"
    },
    "created_at": "2025-10-30T12:00:00Z",
    "read_at": null
  }
]
```

## Permissions

### Role Hierarchy

```
owner (level 3) > editor (level 2) > viewer (level 1)
```

### Permission Matrix

| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View project | ✅ | ✅ | ✅ |
| View comments | ✅ | ✅ | ✅ |
| Add comment | ✅ | ✅ | ✅ |
| Edit BoQ/resources | ✅ | ✅ | ❌ |
| Invite editor/viewer | ✅ | ✅ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Remove collaborators | ✅ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ |

## Configuration

### Customize for Your Project

```python
# backend/app/main.py or your config file

from app.modules.collaboration import CollaborationConfig, create_collaboration_router

# Custom configuration for a CRM system
crm_config = CollaborationConfig(
    # Change context types (what can be collaborated on)
    context_types=["deal", "account", "document"],

    # Change available roles
    available_roles=["admin", "manager", "sales", "viewer"],
    role_hierarchy={
        "admin": 4,
        "manager": 3,
        "sales": 2,
        "viewer": 1
    },

    # Limits
    max_collaborators_per_resource=100,
    invitation_expiry_days=14,

    # Feature toggles
    enable_comments=True,
    enable_invitations=True,
    enable_activity_log=True,
    enable_version_history=False,  # Not implemented yet

    # Comment settings
    max_comment_length=10000,
    allow_comment_threading=True,
    enable_mentions=True
)

# Create router with custom config
crm_collaboration_router = create_collaboration_router(crm_config)

# Mount to your app
app.include_router(crm_collaboration_router, prefix="/api/v1")
```

## Use in Other Projects

### Step 1: Copy Module

```bash
# Copy the entire module to your project
cp -r backend/app/modules/collaboration/ /path/to/your_project/app/modules/

# Also copy models/base.py if you don't have it
cp backend/app/models/base.py /path/to/your_project/app/models/
```

### Step 2: Update Imports

The module imports from `app.core`, `app.models`, `app.db`. Make sure you have:

- `app.core.security.get_current_user()` - JWT auth dependency
- `app.db.session.get_db()` - Database session dependency
- `app.models.base.Base` - SQLAlchemy Base
- `app.models.user.User` - User model
- `app.models.project.Project` - Or your equivalent parent resource

### Step 3: Adapt Models

If your parent resource is not called "Project", update the models:

```python
# In app/modules/collaboration/models.py

# Change ProjectCollaborator to DealCollaborator (for CRM example)
class DealCollaborator(Base):
    __tablename__ = "deal_collaborators"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    deal_id = Column(String, ForeignKey("deals.id", ondelete="CASCADE"), nullable=False)  # Changed!
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(16), nullable=False)
    # ... rest remains same
```

### Step 4: Run Migrations

```bash
# Generate migration
alembic revision --autogenerate -m "Add collaboration module"

# Apply migration
alembic upgrade head
```

### Step 5: Mount Router

```python
from app.modules.collaboration import collaboration_router

app.include_router(collaboration_router, prefix="/api/v1")
```

## Database Schema

The module creates these tables:

- `project_collaborators` - User membership and roles
- `project_invitations` - Pending email invitations
- `comments` - Threaded comments on resources
- `activities` - Audit log of actions
- `notifications` - In-app notifications

All tables use appropriate indexes and foreign keys for performance.

## Security

- ✅ **Token Security**: Invitation tokens are hashed (SHA256) before storage
- ✅ **Permission Checks**: All endpoints enforce RBAC at the API level
- ✅ **SQL Injection**: Protected by SQLAlchemy ORM
- ✅ **JWT Auth**: All endpoints require authentication
- ✅ **Input Validation**: Pydantic schemas validate all inputs

## Performance

- Indexed queries for fast lookups
- Pagination support on list endpoints
- Minimal N+1 query issues (joins used where needed)

## Testing

```bash
# Run backend tests
cd backend
source env/bin/activate
pytest tests/

# Test specific collaboration endpoints
pytest tests/test_collaboration.py -v
```

## Troubleshooting

### "Permission denied" errors

Make sure the user is a collaborator on the project. Check with:

```python
from app.modules.collaboration.service import collaboration_service

collabs = collaboration_service.get_project_collaborators(db, project_id)
print(collabs)
```

### Invitation tokens not working

Tokens expire after `invitation_expiry_days` (default 7). Check the invitation status:

```bash
SELECT * FROM project_invitations WHERE email = 'user@example.com';
```

### Migration issues with SQLite

SQLite has limitations (no ALTER COLUMN, limited DROP COLUMN). Use PostgreSQL in production.

## Future Enhancements (Phase 2+)

- [ ] Real-time updates via WebSocket
- [ ] Live cursors (Miro-style)
- [ ] @mentions with autocomplete
- [ ] Email notifications
- [ ] Version history/revisions
- [ ] Conflict resolution for concurrent edits

## Support

For issues or questions:
- Check API docs: `http://localhost:8000/api/v1/docs`
- Review code: `backend/app/modules/collaboration/`
- Check logs for detailed errors

## License

Part of SkyBuild Pro project. Reusable under project license.
