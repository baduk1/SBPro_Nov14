# Technical Specification — Collaboration & Project Management for SkyBuild Pro

**Version:** 1.0
**Date:** 2025-10-30
**Owner:** Castdev / SkyBuild Pro
**Stack:** React + TypeScript (apps/user-frontend), FastAPI + SQLAlchemy (backend/app), SQLite → PostgreSQL migration path

---

## Executive Summary

This specification defines two major feature sets:

1. **Real-time Collaboration (Miro-style)** — multi-user access to projects with roles (Owner/Editor/Viewer), live presence & cursors, inline comments on BoQ items, activity feed, invitations, conflict handling, version history.

2. **Project Management (Notion-style)** — internal PM (projects, tasks, Kanban, Timeline) with Notion API integration (Phase 1: one-way SkyBuild→Notion, Phase 2: bi-directional sync), document linking, templates, dashboards.

### Architecture Approach

- Keep REST for CRUD and WebSocket (Socket.IO) for real-time events.
- Add Redis for WS pub/sub & job queue.
- Migrate SQLite→PostgreSQL for concurrency & JSON/GIN indexes; keep SQLite in dev.
- Introduce RBAC at project level (simple & fast), optional RLS when on Postgres.
- Notion integration via OAuth 2.0, webhook receiver, resilient sync worker with rate-limit aware retries.

### Timeline (Phased)

- **Phase 1 (Weeks 1-2)** — Core collaboration (invites, roles, inline BoQ editing, basic real-time updates), internal PM (projects, tasks, list view), minimal notifications. **Deliverable:** MVP demo.
- **Phase 2 (Weeks 3-4)** — Presence & live cursors, Kanban & Timeline, Notion one-way sync, calculator enhancements (formulas/markup). **Deliverable:** Production-ready.
- **Phase 3 (Weeks 5-6)** — Activity feed, version history, two-way Notion sync, scenario comparisons, polish. **Deliverable:** Complete feature set.

### Resource Requirements

- **Frontend:** 1 senior FE (React/TS)
- **Backend:** 1 senior BE (FastAPI/SQLAlchemy/Postgres, WebSockets, OAuth)
- **DevOps (part-time):** infra for Redis, socket proxy, secrets, monitoring.

### Success Metrics & Acceptance

- **Latency:** median WS event delivery < 100 ms same-region; P95 < 300 ms.
- **Reliability:** WS reconnect < 3 s; Notion sync success > 99%.
- **Engagement:** ≥ 40% active projects with ≥2 collaborators in 30 days.
- **Quality:** Test coverage (BE unit+integration) ≥ 70%; no P1 security findings.

---

## Technical Architecture

### System Design Overview

**Components (text diagram)**

```
[Browser: React/TS]
  |-- REST (HTTPS) ------------------------------> [FastAPI /api/v1 ...]
  |-- WebSocket (wss, Socket.IO) ----------------> [WS Server (python-socketio ASGI)]
  |                                               |-- Pub/Sub --> [Redis]
  |                                               |-- Jobs -----> [RQ/Redis]
  |                                               '-- DB ORM ---> [PostgreSQL (or SQLite dev)]
  |-- OAuth Redirect (Notion) <------------------> [Notion API]
  '-- Email (invitations/alerts) ----------------> [SMTP / SendGrid fallback]
```

### Key Interaction Flows

1. **BoQ inline edit** → REST PATCH `/boq/items/{id}` → persist → broadcast `boq:item:updated` to project room → peers update UI & show toast.
2. **Invite collaborator** → REST POST `/projects/{id}/invite` → email link → GET `/join-project?token=...` → adds membership → broadcast `collab:member:added`.
3. **Task create/update** → REST → broadcast `task:*` → Kanban/List state updates.
4. **Notion sync (Phase 1)** → Task change enqueued → job worker updates Notion page → status persisted; Webhook later for Phase 2.

### Technology Additions/Changes

**Backend:**
- `python-socketio[asgi]`, `redis`, `rq`, `itsdangerous` (invite tokens), `alembic`, `notion-client` (Python SDK), `fastapi-mail` (or SMTP via `aiosmtplib`).

**Frontend:**
- `socket.io-client`, `@hello-pangea/dnd` (Kanban), `react-virtualized` (large lists), `react-gantt-task-timeline` (Timeline), `zustand` (optional lightweight state for WS), `react-hook-form`.

**Infra:**
- Redis, Postgres, Nginx (WS upgrade), secrets vault.

---

## Database Schema Changes

**Note:** Use Alembic migrations. Dev uses SQLite; production must be PostgreSQL (JSONB, GIN, row-level locks).

### New Tables

#### Project Collaborators & Invites

```sql
CREATE TABLE project_collaborators (
  id               BIGSERIAL PRIMARY KEY,
  project_id       BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role             VARCHAR(16) NOT NULL CHECK (role IN ('owner','editor','viewer')),
  invited_by       BIGINT NOT NULL REFERENCES users(id),
  invited_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at      TIMESTAMPTZ NULL,
  UNIQUE (project_id, user_id)
);
CREATE INDEX idx_collab_project ON project_collaborators(project_id);
CREATE INDEX idx_collab_user ON project_collaborators(user_id);

CREATE TABLE project_invitations (
  id               BIGSERIAL PRIMARY KEY,
  project_id       BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email            CITEXT NOT NULL,
  role             VARCHAR(16) NOT NULL CHECK (role IN ('editor','viewer')),
  token_hash       TEXT NOT NULL, -- store hash only
  status           VARCHAR(16) NOT NULL CHECK (status IN ('pending','accepted','revoked','expired')) DEFAULT 'pending',
  invited_by       BIGINT NOT NULL REFERENCES users(id),
  invited_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NULL
);
CREATE INDEX idx_invites_project ON project_invitations(project_id);
CREATE INDEX idx_invites_email ON project_invitations(email);
```

#### Comments on BoQ or Tasks

```sql
CREATE TABLE comments (
  id               BIGSERIAL PRIMARY KEY,
  project_id       BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  context_type     VARCHAR(16) NOT NULL CHECK (context_type IN ('boq','task','project')),
  context_id       BIGINT NOT NULL, -- references appropriate table by convention
  author_id        BIGINT NOT NULL REFERENCES users(id),
  body             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  parent_id        BIGINT NULL REFERENCES comments(id) ON DELETE CASCADE
);
CREATE INDEX idx_comments_project_context ON comments(project_id, context_type, context_id);
```

#### Activity Feed / Audit

```sql
CREATE TABLE activities (
  id               BIGSERIAL PRIMARY KEY,
  project_id       BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id         BIGINT NOT NULL REFERENCES users(id),
  type             VARCHAR(64) NOT NULL, -- e.g., 'boq.updated','task.created','member.added'
  payload          JSONB NOT NULL,       -- changed fields etc.
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_project_created ON activities(project_id, created_at DESC);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_payload_gin ON activities USING GIN (payload);
```

#### Version History for BoQ & Tasks

```sql
CREATE TABLE boq_item_revisions (
  id               BIGSERIAL PRIMARY KEY,
  item_id          BIGINT NOT NULL REFERENCES boq_items(id) ON DELETE CASCADE,
  project_id       BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  changed_by       BIGINT NOT NULL REFERENCES users(id),
  changes          JSONB NOT NULL, -- {"quantity":{"old":100,"new":150}, ...}
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_boq_rev_item ON boq_item_revisions(item_id);
CREATE INDEX idx_boq_rev_project ON boq_item_revisions(project_id);

CREATE TABLE task_revisions (
  id               BIGSERIAL PRIMARY KEY,
  task_id          BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id       BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  changed_by       BIGINT NOT NULL REFERENCES users(id),
  changes          JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Tasks (Internal PM)

```sql
CREATE TABLE tasks (
  id               BIGSERIAL PRIMARY KEY,
  project_id       BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NULL,
  status           VARCHAR(24) NOT NULL DEFAULT 'todo', -- 'todo','in_progress','done','blocked'
  priority         VARCHAR(16) NULL, -- 'low','medium','high','urgent'
  assignee_id      BIGINT NULL REFERENCES users(id),
  due_date         DATE NULL,
  start_date       DATE NULL,
  type             VARCHAR(24) NULL, -- 'task','rfi','change','milestone'
  boq_item_id      BIGINT NULL REFERENCES boq_items(id) ON DELETE SET NULL,
  labels           TEXT[] NULL,
  created_by       BIGINT NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

#### Notifications

```sql
CREATE TABLE notifications (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id),
  project_id       BIGINT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type             VARCHAR(64) NOT NULL, -- 'mention','invite','task.assigned',...
  payload          JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at          TIMESTAMPTZ NULL
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at);
```

#### Notion Integration

```sql
CREATE TABLE notion_connections (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id),
  workspace_name   TEXT NULL,
  access_token_enc TEXT NOT NULL, -- encrypted
  bot_id           TEXT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  refreshed_at     TIMESTAMPTZ NULL
);

CREATE TABLE project_notion_mappings (
  id               BIGSERIAL PRIMARY KEY,
  project_id       BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  notion_database_id TEXT NOT NULL,
  connection_id    BIGINT NOT NULL REFERENCES notion_connections(id) ON DELETE CASCADE,
  field_map        JSONB NOT NULL, -- mapping internal<->Notion properties
  sync_direction   VARCHAR(8) NOT NULL CHECK (sync_direction IN ('oneway','twoway')) DEFAULT 'oneway',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_notion_project_unique ON project_notion_mappings(project_id);

CREATE TABLE notion_task_links (
  id               BIGSERIAL PRIMARY KEY,
  task_id          BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  notion_page_id   TEXT NOT NULL,
  last_synced_at   TIMESTAMPTZ NULL,
  UNIQUE (task_id), UNIQUE (notion_page_id)
);
```

### Modifications to Existing Tables

```sql
-- projects: ensure owner available for bootstrap (if not present)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id BIGINT NULL REFERENCES users(id);

-- boq_items: add updated_at & last_changed_by for optimistic checks
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS last_changed_by BIGINT NULL REFERENCES users(id);

-- suppliers: add updated_at
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
```

### Indexing Strategy

- GIN on JSONB `activities.payload`, `notifications.payload` for ad-hoc filters.
- B-tree indexes on `tasks(project_id,status,assignee_id)`, `comments(project_id,context_type,context_id)`.
- PostgreSQL only: consider partial indexes (e.g., `notifications WHERE read_at IS NULL`).

### SQLAlchemy Models

Create:
- `backend/app/models/collaboration.py`
- `backend/app/models/tasks.py`
- `backend/app/models/comments.py`
- `backend/app/models/activities.py`
- `backend/app/models/notion.py`
- `backend/app/models/notifications.py`

With models mirroring the above schemas (use Enum types or String with constraint validators). Provide `__repr__`, timestamps, and relationship helpers.

### Migration Scripts Outline

**`versions/2025_10_30_0001_init_collab_pm.py`:**
- Create new tables listed above, add columns to existing.
- Backfill `projects.owner_id` using existing creator if available.
- Data migration: for each project without collab rows, insert owner row in `project_collaborators`.

---

## API Design

**Base path:** `/api/v1`

### Auth & Roles

- All endpoints require JWT auth (`Authorization: Bearer`).
- Use decorator/dependency `require_project_role(project_id, min_role)` with hierarchy: `owner > editor > viewer`.

### Projects & Collaborators

#### `GET /projects/{project_id}/collaborators`
- **Auth:** viewer+
- **Response 200:** `[{ id, user: {id,name,email}, role, invited_at, accepted_at }]`

#### `POST /projects/{project_id}/invite`
- **Auth:** owner|editor (only owner can grant owner; editors can invite editor/viewer)
- **Request:**
```json
{ "email": "user@example.com", "role": "editor", "expires_in_days": 7 }
```
- **Response 201:** `{ "invitation_id": 123, "status": "sent" }`

#### `POST /projects/{project_id}/collaborators/{user_id}` (change role)
- **Auth:** owner
- **Body:** `{ "role": "editor" }`
- **Response 200:** `{ "ok": true }`

#### `DELETE /projects/{project_id}/collaborators/{user_id}`
- **Auth:** owner
- **Response 200:** `{ "ok": true }`

#### `GET /join-project` (public, UI redirects)
- **Query:** `project`, `token`
- **Flow:** verifies token → attaches current user → 302 to `/projects/{id}`

### Comments

#### `GET /projects/{pid}/comments`
- **Query:** `context_type`, `context_id`, `cursor`, `limit`
- **Auth:** viewer+
- **Response 200:** paginated comments tree

#### `POST /projects/{pid}/comments`
- **Auth:** commenter (editor/viewer can comment; configurable)
- **Body:**
```json
{ "context_type":"boq", "context_id":123, "body":"Check assumption...", "parent_id": null }
```
- **Response 201:** comment object + WS `comment:created`

### Activities

#### `GET /projects/{pid}/activities?since=...&type=...`
- **Auth:** viewer+
- **Response 200:** recent activities

### BoQ Editing

#### `PATCH /boq/items/{item_id}`
- **Auth:** editor+
- **Body (partial):**
```json
{ "quantity": 150, "unit_price": 45.5, "updated_at": "2025-10-30T12:00:01Z" }
```
- **Logic:** Enforce optimistic concurrency: if `updated_at` mismatch → 409 `{conflict}`
- **Response 200:** item; **WS:** `boq:item:updated`

#### `POST /boq/items/bulk`
- **Auth:** editor+
- **Body:** array of partial updates
- **Response 200:** summary, **WS** emits per-item or batch event `boq:bulk:updated`

### Tasks (PM)

#### `GET /projects/{pid}/tasks?status=&assignee=&q=&page=&limit=`
- **Auth:** viewer+
- **Response 200:** tasks list

#### `POST /projects/{pid}/tasks`
- **Auth:** editor+
- **Body:**
```json
{
  "title": "Verify concrete takeoff",
  "description": "Spot check beams on L2",
  "status": "todo",
  "priority": "high",
  "assignee_id": 42,
  "due_date": "2025-11-05",
  "type": "task",
  "boq_item_id": 123
}
```
- **Response 201:** task; **WS:** `task:created`

#### `PATCH /tasks/{id}`
- **Auth:** editor+ (assignee may edit limited fields if policy enabled)
- **Body:** partial; **WS:** `task:updated`

#### `DELETE /tasks/{id}`
- **Auth:** editor+
- **Response 204;** **WS:** `task:deleted`

#### `GET /tasks/{id}/revisions`
- **Auth:** viewer+
- **Response 200:** history entries

### Notifications

#### `GET /notifications?unread=true`
- **Auth:** self
- **Response 200:** list

#### `POST /notifications/{id}/read`
- **Auth:** owner of notification
- **Response 200**

### Notion Integration

#### `GET /integrations/notion/connect`
- → 302 to Notion OAuth authorize

#### `GET /integrations/notion/callback?code=...&state=...`
- Exchanges code → stores encrypted token in `notion_connections` → 302 to FE settings page.

#### `POST /projects/{pid}/notion/link`
- **Auth:** owner
- **Body:**
```json
{
  "connection_id": 1,
  "notion_database_id": "xxxx-xxxx",
  "field_map": {
    "title": "Name",
    "status": "Status",
    "due_date": "Due",
    "assignee": "Assignee"
  },
  "sync_direction": "oneway"
}
```
- **Response 201**

#### `POST /projects/{pid}/notion/sync`
- **Auth:** editor+
- Enqueue full push (Phase 1).
- **Response 202:** `{ "enqueued": true }`

#### `POST /integrations/notion/webhook` (public endpoint)
- Verify signature → parse events → update tasks (Phase 2)
- **Response 200:** `{ "ok": true }`

---

## Real-Time Architecture

### Library Choice

**Backend:** `python-socketio` (ASGI app mounted in FastAPI), `RedisManager` for multi-instance broadcast.

**Frontend:** `socket.io-client`.

**Fallback:** automatic reconnect; if WS blocked, fallback to polling (socket.io built-in).

### Namespaces / Rooms

- **Namespace:** `/projects`
- **Room:** `project:{project_id}`

### Event Types & Payloads

- `presence:join` - `{ user: {id,name}, project_id }`
- `presence:leave` - `{ user, project_id }`
- `cursor:update` - `{ user_id, view: 'boq'|'kanban', x, y, selection?: {type:'cell'|'row', id} }`
- `boq:item:updated` - (see example in implementation section)
- `boq:bulk:updated` - `{ project_id, count, fields }`
- `comment:created` - `{ project_id, context_type, context_id, comment }`
- `task:created|updated|deleted` - `{ project_id, task }` / `{ task_id }`
- `notification:new` - `{ user_id, notification }`
- `activity:new` - `{ project_id, activity }`

### Connection Management

- **On connect:** validate JWT, authorize membership, `join_room(project:{id})`, broadcast `presence:join`.
- **Heartbeat:** client emits `presence:heartbeat` every 20s; server prunes after 40s inactivity.
- **Reconnect strategy:** exponential backoff (max 30s), replay missed events by refetching deltas (FE refetch endpoints on reconnect).

### Scaling

- Behind Nginx with upgrade for WS.
- Multiple app instances use Redis pub/sub (`socketio.AsyncRedisManager`).
- Max connections planned: 1k per region. Monitor CPU (event loop), memory, WS backpressure.
- For heavy rooms (>100 users), batch certain events (e.g., throttle `cursor:update` to 10/s/client).

---

## Third-Party Integrations (Notion)

### OAuth 2.0

1. `GET /integrations/notion/connect` → generate state, store in server session (or signed cookie), redirect to Notion authorize.
2. Callback exchanges code for token via `POST https://api.notion.com/v1/oauth/token`.
3. Store token encrypted (Fernet with master key); record workspace metadata.

### Webhook Handling

- Register webhook URL in Notion (Phase 2) for database changes.
- Verify signatures (HMAC secret). Respond fast (<1s) and offload processing to job queue.

### Sync Mechanism

**Phase 1 (one-way SkyBuild→Notion):**
- On task create/update/delete, enqueue Notion update.
- Create Notion page in linked database with mapped props.
- Respect rate limit (~3 rps): worker uses leaky bucket; exponential backoff on 429.

**Phase 2 (two-way):**
- Webhook → fetch changed page → apply to internal task if newer.
- Conflict policy: last-write-wins using timestamps; log conflicts; optional "SkyBuild wins" override per project setting.

### Fallback

If Notion API down: mark project mapping `sync_error=true`, queue retry; surface banner in UI with "Retry now".

---

## Feature-by-Feature Implementation Guides

### Feature: Collaboration

#### Implementation Phases

**Phase 1 (MVP, 2-3 weeks)**
- Roles & invites; collaborator list
- Inline BoQ editing with optimistic UI + REST + WS updates
- Comments on BoQ & tasks; basic notifications (email for mentions)
- Minimal presence (who is online)

**Phase 2 (1-2 weeks)**
- Live cursors & selections (throttled)
- Kanban-style commenting sidebar, @mentions autocomplete
- Activity feed panel
- Basic version history views (read-only)

**Phase 3 (1 week)**
- Fine-grained conflict handling (per-field locks)
- Exportable audit logs
- Domain-wide share (enterprise toggle)

#### Backend Tasks

**Task BE-COLLAB-01: Project Roles & Membership API**
- **Description:** Implement `project_collaborators` CRUD, permissions checks.
- **Files:**
  - `backend/app/models/collaboration.py` (models)
  - `backend/app/api/v1/endpoints/projects.py` (add collab routes)
  - `backend/app/services/permissions.py` (helper: `require_role`)
  - `backend/app/core/security.py` (token helpers)
- **Logic:** Only owner can grant/revoke owner; editors can invite editor/viewer. Prevent duplicate invites/members.
- **Testing:** unit (role matrix), integration (invite flow), negative tests.
- **Effort:** 10h

**Task BE-COLLAB-02: Invitation Flow & Email**
- **Files:**
  - `backend/app/services/email_service.py` (SMTP + SendGrid fallback)
  - `backend/app/api/v1/endpoints/projects.py` (invite, join routes)
  - Email template: `templates/email/invite.html` (Jinja)
- **Security:** store hash of token only; token signed w/ `itsdangerous` (expires).
- **Acceptance:** Invite sent; join completes; invalid/expired handled; audit activity `member.added`.
- **Effort:** 8h

**Task BE-COLLAB-03: Comments API**
- **Files:**
  - `backend/app/models/comments.py`
  - `backend/app/api/v1/endpoints/comments.py`
  - `backend/app/services/mentions.py` (parse @mentions, create notifications)
- **Endpoints:** `GET/POST /projects/{pid}/comments`
- **WS:** `comment:created`
- **Effort:** 8h

**Task BE-COLLAB-04: WebSocket Server**
- **Files:**
  - `backend/app/realtime/ws_manager.py` (Socket.IO server, RedisManager)
  - `backend/app/main.py` (mount ASGI app)
  - `backend/app/realtime/events.py` (event handlers: join, leave, cursor, broadcast helpers)
- **Auth:** JWT in auth header or query param, validated on connect.
- **Effort:** 12h

**Task BE-COLLAB-05: BoQ Update Service + Broadcast**
- **Files:**
  - `backend/app/services/boq_service.py`
  - `backend/app/api/v1/endpoints/boq.py` (PATCH/bulk)
  - `backend/app/services/activities.py`
- **Logic:** Validate editor, capture old values, save, record revision & activity, broadcast `boq:item:updated`.
- **Conflict:** optimistic concurrency via `updated_at`.
- **Effort:** 10h

**Task BE-COLLAB-06: Activity Feed & Revisions**
- **Files:**
  - `backend/app/api/v1/endpoints/activities.py`
  - `backend/app/api/v1/endpoints/boq_revisions.py`
  - `backend/app/api/v1/endpoints/task_revisions.py`
- **Effort:** 10h

**Task BE-COLLAB-07: Notifications**
- **Files:**
  - `backend/app/models/notifications.py`
  - `backend/app/services/notify.py` (create in-app + optional email)
  - `backend/app/api/v1/endpoints/notifications.py`
- **Events:** `notification:new` to user room
- **Effort:** 8h

#### Frontend Tasks

**Task FE-COLLAB-01: Collaborators UI & Invite Modal**
- **Files:**
  - `apps/user-frontend/src/components/collaboration/CollaboratorList.tsx`
  - `apps/user-frontend/src/components/collaboration/InviteCollaboratorModal.tsx`
  - `apps/user-frontend/src/pages/ProjectSettings.tsx` (section)
- **Specs:** Email validation, role select, success toast, refresh list.
- **API:** `GET/POST /projects/{id}/collaborators`, `POST /projects/{id}/invite`
- **Effort:** 6h

**Task FE-COLLAB-02: WebSocket Hook & Provider**
- **Files:**
  - `src/providers/RealtimeProvider.tsx`
  - `src/hooks/useRealtime.ts`
  - `src/hooks/usePresence.ts`
- **Details:** Connect on project view mount, auto-reconnect; join room; expose `emit`, `on`, `off`. Maintain presence map; show avatars.
- **Effort:** 8h
- **Lib:** `socket.io-client`

**Task FE-COLLAB-03: BoQ Inline Editing + Real-time Updates**
- **Files:**
  - `src/components/boq/BoQTable.tsx`
  - `src/hooks/useBoQRealtime.ts`
- **Features:** Double-click to edit cells; optimistic UI; rollback on 409 conflict (show banner). Listen to `boq:item:updated`.
- **Effort:** 12h

**Task FE-COLLAB-04: Comments Sidebar with @mentions**
- **Files:**
  - `src/components/comments/CommentsPanel.tsx`
  - `src/components/comments/CommentItem.tsx`
- **Features:** Context aware (boq/task); markdown support (basic); @mention autocomplete of project members.
- **Effort:** 10h

**Task FE-COLLAB-05: Live Cursors & Selection Layer (Phase 2)**
- **Files:**
  - `src/components/realtime/CursorLayer.tsx`
- **Details:** Throttle emits to 10/s; interpolate positions.
- **Effort:** 8h

---

### Feature: Project Management

#### Implementation Phases

**Phase 1 (2 weeks):** Internal tasks (list), minimal Kanban, basic filters, link tasks to BoQ items.

**Phase 2 (1 week):** Kanban (drag-drop), Timeline view (start/due), labels, search, dashboard KPIs.

**Phase 3 (1 week):** Templates, archiving, cross-project dashboard.

#### Backend Tasks

**Task BE-PM-01: Tasks CRUD & Filters**
- **Files:**
  - `backend/app/models/tasks.py`
  - `backend/app/api/v1/endpoints/tasks.py`
  - `backend/app/services/tasks_service.py`
- **Effort:** 12h

**Task BE-PM-02: Task↔BoQ linkage & Revisions**
- **Effort:** 6h
- **Acceptance:** `boq_item_id` reference; history on change.

**Task BE-PM-03: Project KPIs endpoint**
- **Endpoint:** `GET /projects/{pid}/dashboard`
- **Returns:** `{ total_tasks, done_tasks, overdue, est_total_cost, completion_pct }`
- **Effort:** 6h

**Task BE-PM-04: Project templates**
- **Tables:** `project_templates`, `template_tasks` (simple seed).
- **Endpoint:** `POST /projects/from-template/{template_id}`
- **Effort:** 8h

#### Frontend Tasks

**Task FE-PM-01: Task List & Editor**
- **Files:**
  - `src/components/tasks/TaskList.tsx`
  - `src/components/tasks/TaskRow.tsx`
  - `src/components/tasks/TaskFormModal.tsx`
- **Features:** create/edit task, filters (assignee/status), column sort.
- **Effort:** 12h

**Task FE-PM-02: Kanban Board (Phase 2)**
- **Files:** `src/components/tasks/KanbanBoard.tsx`
- **Lib:** `@hello-pangea/dnd`
- **Details:** Drag-drop moves status; optimistic; fallback on error.
- **Effort:** 10h

**Task FE-PM-03: Timeline View (Phase 2)**
- **Files:** `src/components/tasks/TimelineView.tsx`
- **Lib:** `react-gantt-task-timeline`
- **Effort:** 8h

**Task FE-PM-04: Project Dashboard KPIs**
- **Files:** `src/pages/ProjectDashboard.tsx`
- **Charts:** recharts for cost breakdown
- **Effort:** 8h

---

### Feature: Notion Integration

#### Implementation Phases

**Phase 1:** OAuth connect; choose DB; push tasks to Notion.

**Phase 2:** Webhook; two-way sync; conflict policy.

#### Backend Tasks

**Task BE-NOTION-01: OAuth Connect & Token Store**
- **Files:**
  - `backend/app/api/v1/endpoints/integrations_notion.py`
  - `backend/app/services/notion_service.py`
  - `backend/app/core/crypto.py` (Fernet helpers)
- **Effort:** 12h

**Task BE-NOTION-02: Link Project to Notion Database**
- **Endpoint:** `POST /projects/{pid}/notion/link`
- **Effort:** 6h

**Task BE-NOTION-03: Push Sync Worker (RQ job)**
- **Files:**
  - `backend/app/jobs/notion_push.py`
- **Details:** Map internal task→Notion page properties.
- **Effort:** 12h

**Task BE-NOTION-04: Webhook Receiver & Pull Sync (Phase 2)**
- **Files:** `backend/app/api/v1/endpoints/integrations_notion.py`
- **Effort:** 12h
- **Testing:** Mock Notion API; rate-limit behavior; idempotency.

#### Frontend Tasks

**Task FE-NOTION-01: Integration Settings UI**
- **Files:**
  - `src/pages/IntegrationsNotion.tsx`
  - `src/components/integrations/NotionConnectButton.tsx`
- **Effort:** 8h

**Task FE-NOTION-02: Project Sync Controls**
- **Files:** `src/components/integrations/ProjectNotionPanel.tsx`
- **Effort:** 6h

---

### Feature: Editing (BoQ, Pricing, Suppliers, Project Meta)

#### Implementation Phases

**Phase 1:** Inline editing BoQ/pricing, validation, bulk edit.

**Phase 2:** Undo/redo (per session), draft mode.

**Phase 3:** Approval workflow (enterprise).

#### Backend Tasks

**Task BE-EDIT-01: Validation & Bulk Update for BoQ**
- **Details:** Server-side validation rules (units, non-negative quantities/prices). Bulk endpoint; transactionally atomic.
- **Effort:** 10h

**Task BE-EDIT-02: Supplier updates & price list versioning**
- **Details:** Add `updated_at`, optional `supplier_price_lists` table with version tag.
- **Effort:** 8h

**Task BE-EDIT-03: Project metadata PATCH**
- **Effort:** 4h

**Task BE-EDIT-04: Undo/Redo session (Phase 2)**
- **Details:** Keep recent changes per user in Redis (list of ops); apply inverse ops.
- **Effort:** 12h

#### Frontend Tasks

**Task FE-EDIT-01: Inline Editors with Validation**
- **Details:** Controlled inputs; error tooltips; server error mapping.
- **Effort:** 12h

**Task FE-EDIT-02: Bulk Edit Panel**
- **Details:** Multi-select rows → set field → preview → apply.
- **Effort:** 10h

**Task FE-EDIT-03: Draft Mode (Phase 2)**
- **Details:** Toggle "Draft"; banner; publish action.
- **Effort:** 8h

---

### Feature: Calculator Enhancements

#### Implementation Phases

**Phase 2:** Formula builder & markup rules; taxes; discounts.

**Phase 3:** Scenario comparison; what-if; export formulas.

#### Backend Tasks

**Task BE-CALC-01: Pricing Rules & Formulas**
- **Tables:**

```sql
CREATE TABLE pricing_rules (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope VARCHAR(24) NOT NULL CHECK (scope IN ('line','category','project')),
  formula TEXT NOT NULL, -- small DSL, safe-eval
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tax_rates (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate NUMERIC(6,3) NOT NULL, -- percent
  applies_to VARCHAR(24) NOT NULL, -- 'materials','labor','all'
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE discount_rules (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level VARCHAR(24) NOT NULL CHECK (level IN ('line','category','project')),
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('flat','percent','tiered')),
  config JSONB NOT NULL
);

CREATE TABLE calc_scenarios (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  overrides JSONB NOT NULL, -- overrides for rules/taxes/discounts
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- **Safe evaluation:** implement restricted evaluator (e.g., use `simpleeval` with whitelisted functions: `min`, `max`, `ceil`, `floor`, `round`) and context (`quantity`, `unit_price`, `overhead`, etc.). Never `eval`.
- **API:**
  - `POST /projects/{pid}/calculator/preview` → returns totals and breakdown for given overrides.
  - `GET /projects/{pid}/calculator/export` → CSV/Excel with formula text.
- **Effort:** 20h

#### Frontend Tasks

**Task FE-CALC-01: Formula Builder UI**
- **Details:** Monaco Editor optional, or structured form (fields + functions). Preview pane with recalculated totals.
- **Effort:** 12h

**Task FE-CALC-02: Scenario Comparison (Phase 3)**
- **Details:** Side-by-side tables, chart with recharts.
- **Effort:** 10h

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2) — Priority 1

**Backend:**
- BE-COLLAB-01 through 05, 07
- BE-PM-01
- BE-EDIT-01 through 03

**Frontend:**
- FE-COLLAB-01 through 03
- FE-PM-01
- FE-EDIT-01 through 02

**Deliverable:** Working demo — invite collaborators; edit BoQ in real-time; create tasks; comments; basic notifications.

### Phase 2: Real-Time & Integration (Week 3-4) — Priority 2

**Backend:**
- BE-COLLAB-06
- BE-PM-02 through 03
- BE-NOTION-01 through 03
- BE-CALC-01

**Frontend:**
- FE-COLLAB-04, 05
- FE-PM-02 through 04
- FE-NOTION-01 through 02
- FE-CALC-01

**Deliverable:** Presence+cursor; Kanban/Timeline; Notion one-way sync; enhanced calculator.

### Phase 3: Polish & Advanced (Week 5-6) — Priority 3/4

**Backend:**
- BE-NOTION-04
- BE-EDIT-04
- BE-PM-04

**Frontend:**
- FE-CALC-02
- FE-EDIT-03

**Deliverable:** Activity/version exports; bi-directional Notion; scenarios.

---

## Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation | Contingency |
|------|------------|--------|------------|-------------|
| WS scaling under burst (100+ users/room) | Medium | High | Throttle cursor events; batch broadcasts; Redis pub/sub; load test | Temporarily disable cursors (feature flag) |
| Notion API rate limit (3 rps) | High | Medium | Leaky bucket limiter, backoff on 429, queue jobs | Degrade to batch nightly sync; user "Sync now" |
| SQLite write contention | High | High | Migrate prod to Postgres before launch | Switch feature flags to polling, reduce concurrency |
| Conflict resolution complexity | Medium | Medium | Optimistic concurrency + per-field locks; LWW policy | Force modal conflict resolution on 409 |
| Email deliverability / SendGrid region | Medium | Medium | SMTP fallback; switchable providers via env | In-app notifications as backup |
| GDPR compliance & data deletion | Low | High | Data retention policies; delete PII on request; encrypt tokens | Block certain features until DPA signed |

---

## Quality Assurance Plan

### Code Reviews
- Mandatory for all PRs
- Checklists include security, performance, error handling

### Testing Targets

**Backend:**
- Unit + integration: ≥ 70% coverage
- Cover permissions, race conditions, sync idempotency

**Frontend:**
- Unit: component tests for editors, hooks
- Integration tests for flows

**E2E:**
- Cypress/Playwright — two browsers editing same project; invites; Notion connect smoke

### Performance Benchmarks

- WS broadcast P50 < 100 ms (local region), P95 < 300 ms
- BoQ PATCH P50 < 120 ms; bulk (100 rows) < 1.5 s

### Security Checklist

- JWT validation everywhere
- Authorization enforced server-side
- No sensitive data in logs
- Encrypt tokens
- CSRF not applicable to WS but protect REST with same-site cookies if used
- SSRF-safe webhooks
- Input validation for formulas

### UAT
- Pilot with 3 real projects
- Gather feedback on UI clarity
- Iterate

---

## Documentation Requirements

### API Documentation
- OpenAPI/Swagger: auto-generated for all REST endpoints (`/docs`)
- Include examples

### Developer Setup
- README updates for Redis, Postgres, env vars
- Running RQ worker
- Notion app config

### User Guide
- "Inviting collaborators"
- "Real-time editing"
- "Comments & mentions"
- "Tasks/Kanban/Timeline"
- "Notion sync"

### Admin Guide
- Managing roles
- Revoking access
- Rotating invite links
- Viewing audit

### Troubleshooting
- WS not connecting (proxy, CORS)
- Notion 401/429
- Email not delivered

---

## Success Metrics & KPIs

### Collaboration Adoption
- % projects with ≥2 collaborators
- Avg comments/task
- Avg concurrent viewers/project

### Performance
- P50/P95 WS delivery
- API latency
- Client error rate

### Reliability
- WS reconnect success rate
- Notion sync failure rate/day

### User Satisfaction
- In-app survey ≥ 4/5 for "collaboration usefulness"
- CSAT on PM views

### Business
- Time-to-estimate reduced (self-reported)
- Reduction in BoQ change errors

---

## API & Code Examples

### Permission Dependency (FastAPI)

```python
# backend/app/services/permissions.py
from fastapi import Depends, HTTPException, status
from backend.app.models.collaboration import ProjectCollaborator
from backend.app.models.projects import Project
from backend.app.core.auth import get_current_user
from sqlalchemy.orm import Session

ROLE_ORDER = {'viewer':1,'editor':2,'owner':3}

def require_project_role(min_role: str):
    def dep(project_id: int, db: Session, user=Depends(get_current_user)):
        project = db.query(Project).filter(Project.id==project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        collab = db.query(ProjectCollaborator).filter_by(project_id=project_id, user_id=user.id).first()
        lvl = ROLE_ORDER.get(collab.role if collab else None, 0)
        if lvl < ROLE_ORDER[min_role]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return (project, collab.role)
    return dep
```

### WebSocket Server (python-socketio)

```python
# backend/app/realtime/ws_manager.py
import socketio
from redis import Redis
from backend.app.core.auth import verify_jwt

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[],
    client_manager=socketio.AsyncRedisManager("redis://redis:6379/0")
)
app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ, auth):
    token = auth.get('token')
    user = verify_jwt(token)
    if not user:
        return False
    sio.save_session(sid, {'user_id': user['id'], 'name': user['name']})
    return True

@sio.on('join_project')
async def join_project(sid, data):
    project_id = data['project_id']
    await sio.enter_room(sid, f"project:{project_id}")
    sess = await sio.get_session(sid)
    await sio.emit('presence:join', {'user': {'id': sess['user_id'], 'name': sess['name']}, 'project_id': project_id},
                   room=f"project:{project_id}")

async def broadcast_project(project_id: int, event: str, payload: dict):
    await sio.emit(event, payload, room=f"project:{project_id}")
```

### Notion Push Worker (RQ job)

```python
# backend/app/jobs/notion_push.py
from notion_client import Client
from backend.app.models import Task, ProjectNotionMapping, NotionConnection
from backend.app.core.crypto import decrypt
from time import sleep

def push_task(task_id: int, db):
    task: Task = db.query(Task).get(task_id)
    mapping = db.query(ProjectNotionMapping).filter_by(project_id=task.project_id).first()
    if not mapping:
        return
    conn = db.query(NotionConnection).get(mapping.connection_id)
    notion = Client(auth=decrypt(conn.access_token_enc))
    props = {
        mapping.field_map['title']: { "title": [ { "text": { "content": task.title } } ] },
        mapping.field_map['status']: { "select": { "name": task.status.title().replace('_',' ') } }
    }
    if task.due_date:
        props[mapping.field_map['due_date']] = { "date": { "start": str(task.due_date) } }
    # create or update
    link = db.query(NotionTaskLink).filter_by(task_id=task.id).first()
    if link:
        notion.pages.update(page_id=link.notion_page_id, properties=props)
    else:
        page = notion.pages.create(parent={"database_id": mapping.notion_database_id}, properties=props)
        db.add(NotionTaskLink(task_id=task.id, notion_page_id=page["id"]))
        db.commit()
    # naive rate limit safety
    sleep(0.4)  # ~2.5rps
```

### Frontend WS Provider

```typescript
// apps/user-frontend/src/providers/RealtimeProvider.tsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type Ctx = { socket: Socket | null };
const RealtimeCtx = createContext<Ctx>({ socket: null });

export const RealtimeProvider: React.FC<{token: string, children: React.ReactNode}> = ({token, children}) => {
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    const s = io('/projects', { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = s;
    return () => { s.disconnect(); socketRef.current = null; }
  }, [token]);
  return <RealtimeCtx.Provider value={{ socket: socketRef.current }}>{children}</RealtimeCtx.Provider>;
};
export const useRealtime = () => useContext(RealtimeCtx);
```

---

## Deployment Considerations

### Infrastructure

- **Postgres** 15+ (managed or container)
- **Redis** 6+
- **RQ worker** process (1-2 dynos)
- **Nginx** with WS upgrade proxy on `/socket.io/`

### Environment Variables

```
DATABASE_URL
REDIS_URL
SECRET_KEY
EMAIL_SMTP_* or SENDGRID_API_KEY
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_WEBHOOK_SECRET
```

### Migrations

- Run Alembic before deploy
- Back up DB

### Monitoring

- WS connection counts, message rates, WS error logs
- Job queue depth; Notion 429 count
- API latency with APM (e.g., OpenTelemetry)

### Security First

- JWT verified on every WS connect and REST call
- Authorization server-side only; FE checks are cosmetic
- Encrypt external tokens (Notion). Do not log payloads containing secrets
- Input validation on all numeric/monetary fields; server-side clamp
- Formula evaluation via whitelist only
- GDPR: implement data export/delete for user; purge invitations after 90 days; log access to PII

### Plan for Failure

- **WS disconnect:** FE shows offline banner; queue edits locally; auto-retry. On reconnect, refetch deltas (GET list endpoints).
- **Notion down/429:** Mark sync error; retry with backoff; user "Sync now".
- **Email fail:** Log to notifications; expose "Resend invite".
- **DB contention:** Retry transactions (SERIALIZABLE in PG where needed).

---

## Completeness Checklist

✅ Clear implementation path per feature with tasks and estimates
✅ Full DB schema (SQL + ORM guidance)
✅ REST endpoints & WS event contracts with examples
✅ FE components, props, state, and integration points
✅ Realistic timeline adding to ~6 weeks with 1-2 devs
✅ Dependencies mapped (Redis, Postgres, OAuth)
✅ Testing, performance, security, deployment specified
✅ Developers can code immediately with file paths & examples

---

## Bonus Answers (Decisions)

### Permissions library vs custom?
Use custom simple RBAC (project-scoped). CASL.js could help FE rendering but not required; backend must enforce anyway. Keep it lean.

### WebSocket vs SSE vs Polling?
WebSocket (Socket.IO) for two-way low-latency + auto fallback. SSE is one-way; polling is last resort.

### Notion sync bi-directional?
Phase 1 one-way (SkyBuild→Notion) for reliability. Phase 2 two-way with LWW and conflict logging.

### Offline collaboration?
Not in MVP. Add read-only caching; queue minor edits; full offline + CRDT is Phase 3+ if demand warrants.

### Mobile (React Native)?
Defer. Ensure responsive web for key flows (view tasks, comment, approve). Consider RN later for field teams.

---

## Next Steps

This specification provides a complete implementation roadmap. Development teams can begin immediately with:

1. Setting up infrastructure (PostgreSQL, Redis)
2. Creating Alembic migrations from the schema definitions
3. Implementing Phase 1 tasks in parallel (backend and frontend)
4. Setting up testing frameworks and CI/CD pipelines

For questions or clarifications, please refer to the code examples and file paths provided throughout this document.
