# 🔒 Complete Security Audit & Implementation Plan

## Дата: 29 октября 2025
## Статус: ❌ **NO-GO для демо 30 октября**
## Источник: Commander's Hard Code-Level Pass (Part 1 + Part 2)

---

## 🚨 CRITICAL VERDICT

**GO/NO-GO:** ❌ **ABSOLUTE NO-GO**

**Reason:** Multiple P0 security leaks active in production:
- Cross-tenant data access (artifacts, exports, files, takeoff)
- Conflicting code versions (atomic vs non-atomic credits)
- Incomplete invite flow (backend missing, frontend mocked)
- No server-side throttling
- Production auto-migration active

**Risk Level:** 🔴 **CRITICAL** - Data breach & demo failure imminent

---

## 📊 Executive Summary

### Found Issues:

| Priority | Count | Status |
|----------|-------|--------|
| P0 (Critical) | **12** | ❌ Not fixed |
| P1 (High) | **8** | ⚠️ Partial |
| P2 (Medium) | **4** | 📋 Planned |
| P3 (Low) | **1** | 📋 Planned |

### Code State:
- ⚠️ **Conflicting file versions** in repository
- ✅ Some hardened versions exist (atomic credits, ownership checks)
- ❌ Wrong versions may deploy
- 🔄 Need unified, reconciled codebase

---

## ❌ P0 BLOCKERS (12 Critical Issues)

### 🔴 GROUP 1: Multi-Tenant Isolation Leaks (P0 - DEMO BLOCKING)

#### 1. Artifacts Presign/Download - No Ownership Check

**File:** `backend/app/api/v1/endpoints/artifacts.py`

**Evidence:**
```python
# Current (VULNERABLE):
@router.post("/{artifact_id}/presign")
def presign_download(artifact_id: str, ...):
    artifact = db.query(Artifact).get(artifact_id)  # ← NO ownership check!
    # Any authenticated user can presign ANY artifact
```

**Impact:** User A can download User B's artifacts if they know the ID

**Fix:**
```python
@router.post("/{artifact_id}/presign")
def presign_download(artifact_id: str, user=Depends(current_user), ...):
    # Join to Job and verify ownership
    artifact = db.query(Artifact).join(Job).filter(
        Artifact.id == artifact_id,
        Job.user_id == user.id  # ← CRITICAL CHECK
    ).first()
    
    if not artifact:
        raise HTTPException(404, "Artifact not found")
```

**Test:**
```bash
# As User A, try to presign User B's artifact
curl -H "Authorization: Bearer $USER_A_TOKEN" \
  -X POST /api/v1/artifacts/$USER_B_ARTIFACT_ID/presign
# Expected: 404 Not Found
```

---

#### 2. Export BOQ - No Owner Filter

**File:** `backend/app/api/v1/endpoints/export.py`

**Evidence:**
```python
# Current (VULNERABLE):
@router.post("/{id}/export")
def export_boq(id: str, ...):
    j = db.query(Job).get(id)  # ← NO user_id filter!
    # Any user can export any job
```

**Impact:** Cross-tenant job export

**Fix:**
```python
@router.post("/{id}/export")
def export_boq(id: str, user=Depends(current_user), ...):
    j = db.query(Job).filter(
        Job.id == id,
        Job.user_id == user.id  # ← CRITICAL CHECK
    ).first()
    
    if not j:
        raise HTTPException(404, "Job not found")
```

---

#### 3. List Artifacts - No Owner Filter

**File:** `backend/app/api/v1/endpoints/export.py`

**Evidence:**
```python
# Current (VULNERABLE):
@router.get("/{id}/artifacts")
def list_artifacts(id: str, ...):
    # No Job ownership verification
    return db.query(Artifact).filter(Artifact.job_id == id).all()
```

**Fix:**
```python
@router.get("/{id}/artifacts")
def list_artifacts(id: str, user=Depends(current_user), ...):
    # Verify job ownership first
    j = db.query(Job).filter(
        Job.id == id,
        Job.user_id == user.id
    ).first()
    
    if not j:
        raise HTTPException(404, "Job not found")
    
    return db.query(Artifact).filter(Artifact.job_id == id).all()
```

---

#### 4. Get File - No Ownership Check

**File:** `backend/app/api/v1/endpoints/files.py`

**Evidence:**
```python
# Current code literally says:
# "Optionally: check ownership"
# And then DOES NOT check it!

@router.get("/{file_id}")
def get_file(file_id: str, ...):
    file = db.query(File).get(file_id)  # ← NO ownership check!
    # Optionally: check ownership ← THIS IS A COMMENT, NOT CODE!
    return file
```

**Impact:** User A can read User B's file metadata

**Fix:**
```python
@router.get("/{file_id}")
def get_file(file_id: str, user=Depends(current_user), ...):
    file = db.query(File).filter(
        File.id == file_id,
        File.user_id == user.id  # ← IMPLEMENT THE CHECK!
    ).first()
    
    if not file:
        raise HTTPException(404, "File not found")
    
    return file
```

---

#### 5. File Presign/Upload - No Project Ownership

**File:** `backend/app/api/v1/endpoints/files.py`

**Evidence:**
```python
# Current (VULNERABLE):
@router.post("/presign")
def create_presigned(payload: PresignUploadRequest, ...):
    f = File(
        project_id=payload.project_id,  # ← User can specify ANY project_id!
        user_id=user.id
    )
    # No check that project.owner_id == user.id
```

**Impact:** User A can upload files to User B's project

**Fix:**
```python
@router.post("/presign")
def create_presigned(payload: PresignUploadRequest, user=Depends(current_user), ...):
    # VERIFY project ownership BEFORE creating file
    project = db.query(Project).filter(
        Project.id == payload.project_id,
        Project.owner_id == user.id  # ← CRITICAL!
    ).first()
    
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Now safe to create file
    f = File(project_id=payload.project_id, user_id=user.id)
```

---

#### 6. Takeoff Endpoints - No Owner Verification

**File:** `backend/app/api/v1/endpoints/takeoff.py`

**Evidence:**
```python
# Current (VULNERABLE):
@router.get("/{id}/takeoff")
def get_takeoff(id: str, ...):
    j = db.query(Job).get(id)  # ← NO user_id check!
    items = db.query(BoqItem).filter(BoqItem.job_id == id).all()
    return items
```

**Impact:** Cross-tenant BOQ access

**Fix:**
```python
@router.get("/{id}/takeoff")
def get_takeoff(id: str, user=Depends(current_user), ...):
    j = db.query(Job).filter(
        Job.id == id,
        Job.user_id == user.id  # ← VERIFY OWNERSHIP
    ).first()
    
    if not j:
        raise HTTPException(404, "Job not found")
    
    return db.query(BoqItem).filter(BoqItem.job_id == id).all()
```

---

#### 7. Patch Mapping - No Owner Verification

**File:** `backend/app/api/v1/endpoints/takeoff.py`

**Evidence:**
```python
# Current (VULNERABLE):
@router.patch("/{id}/mapping")
def patch_mapping(id: str, ...):
    j = db.query(Job).get(id)  # ← NO ownership check!
    # User can modify any job's mapping
```

**Fix:** Same pattern as above - verify `Job.user_id == user.id`

---

### 🔴 GROUP 2: Access Request → Invite Flow (P0 - FEATURE BROKEN)

#### 8. Backend: Missing `/approve` Endpoint

**File:** `backend/app/api/v1/endpoints/admin_access_requests.py`

**Current State:**
```python
# Only has:
@router.get("")  # List requests
@router.patch("/{id}")  # Update status

# MISSING:
# @router.post("/{id}/approve")  # ← DOES NOT EXIST!
```

**Impact:** Admin cannot actually invite users; approval does nothing

**Required Implementation:**
```python
@router.post("/{id}/approve")
def approve_access_request(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Approve access request and send invite email.
    
    Flow:
    1. Load AccessRequest
    2. Check if user exists:
       - Exists + verified → 409 Conflict
       - Exists + not verified → regenerate invite
       - Not exists → create user (no password, email_verified=False)
    3. Generate invite token (UUID, 48h TTL)
    4. Send invite email with link
    5. Mark request as approved
    """
    request = db.query(AccessRequest).get(id)
    if not request:
        raise HTTPException(404, "Request not found")
    
    # Check if user exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    
    if existing_user:
        if existing_user.email_verified:
            raise HTTPException(409, "User already registered")
        user = existing_user
    else:
        # Create new user (no password yet)
        user = User(
            email=request.email,
            full_name=request.name,
            role='user',
            email_verified=False,
            credits_balance=2000  # Trial credits
        )
        db.add(user)
        db.flush()
    
    # Generate invite token
    token = EmailVerificationToken.create_token_with_expiry(
        user_id=user.id,
        hours=48
    )
    db.add(token)
    
    # Update request status
    request.status = 'approved'
    request.approved_at = datetime.utcnow()
    
    db.commit()
    
    # Send invite email
    EmailService.send_invite_email(
        to_email=user.email,
        token=token.token,
        user_name=user.full_name
    )
    
    return {"message": "Invite sent", "email": user.email}
```

---

#### 9. Backend: Missing `/complete-invite` Endpoint

**File:** `backend/app/api/v1/endpoints/auth.py`

**Current State:** Does NOT exist

**Required Implementation:**
```python
@router.post("/complete-invite")
def complete_invite(
    token: str,
    password: str,
    db: Session = Depends(get_db)
):
    """
    Complete invite by setting password and verifying email.
    
    Used when user clicks invite link and sets password.
    """
    # Find invite token
    invite = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token
    ).first()
    
    if not invite:
        raise HTTPException(400, "Invalid invite token")
    
    if invite.used_at:
        raise HTTPException(400, "Invite already used")
    
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(400, "Invite expired")
    
    # Get user
    user = db.query(User).get(invite.user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Set password and verify email
    user.hash = get_password_hash(password)
    user.email_verified = True
    invite.used_at = datetime.utcnow()
    
    db.commit()
    
    # Create login token
    token = create_access_token(
        {"sub": user.id, "role": user.role},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "message": "Account activated",
        "email": user.email,
        "access_token": token,
        "token_type": "bearer"
    }
```

---

#### 10. Frontend: Mocked AccessRequestForm

**File:** `apps/user-frontend/src/components/AccessRequestForm.tsx`

**Current State:** Uses `localStorage` mocks

**Required Fix:**
```typescript
// REMOVE all localStorage code
// REMOVE fake verification modal

// ADD real API call:
const handleSubmit = async () => {
  try {
    await api.post('/public/access-requests', {
      name,
      email,
      company,
      message
    })
    
    setSubmitted(true)
    // Show: "Thank you! Check your email if approved."
  } catch (err) {
    setError(err.response?.data?.detail || 'Failed to submit')
  }
}
```

---

#### 11. Frontend: Admin UI Doesn't Call `/approve`

**File:** `apps/admin-frontend/src/pages/AdminAccessRequests.tsx`

**Current State:** Only calls `PATCH` to update status

**Required Fix:**
```typescript
const handleApprove = async (id: string) => {
  try {
    await api.post(`/admin/access-requests/${id}/approve`)
    alert('Invite sent!')
    loadRequests()
  } catch (err) {
    alert(err.response?.data?.detail || 'Failed to approve')
  }
}
```

---

### 🔴 GROUP 3: Conflicting Code Versions (P0 - DEPLOYMENT RISK)

#### 12. Credits: Two Versions Exist

**Problem:** Repository contains BOTH:

**Version A (WRONG - Not atomic):**
```python
# jobs.py (old version)
user.credits_balance -= job_cost
db.commit()  # ← Race condition! Not atomic!
job = Job(...)
db.commit()
```

**Version B (CORRECT - Atomic):**
```python
# jobs.py (new version)
result = db.execute(
    update(User)
    .where(User.id == user.id, User.credits_balance >= job_cost)
    .values(credits_balance=User.credits_balance - job_cost)
)

if result.rowcount == 0:
    raise HTTPException(402, "Insufficient credits")

# Now create job in same transaction
```

**Risk:** Build might pick Version A → race conditions in production

**Action:** DELETE Version A, keep only Version B

---

## 🟠 P1 HIGH PRIORITY (8 Issues)

### 13. Resend Verification - No Server Throttle

**File:** `backend/app/api/v1/endpoints/auth.py`

**Current:**
```python
# Code comment literally says "TODO"
# Only client-side cooldown, no server enforcement
```

**Required:**
```python
# Add to User model:
last_verification_sent_at = Column(DateTime, nullable=True)

# In resend_verification:
if user.last_verification_sent_at:
    delta = (datetime.utcnow() - user.last_verification_sent_at).total_seconds()
    if delta < 60:
        raise HTTPException(429, f"Try again in {60-int(delta)} seconds")

# After sending:
user.last_verification_sent_at = datetime.utcnow()
db.commit()
```

---

### 14. Sign-In Demo Content in Production

**File:** `apps/user-frontend/src/pages/SignIn.tsx`

**Current:**
```typescript
const [email, setEmail] = useState('test')  // ← Always!
<Alert>Demo mode: use "test"</Alert>  // ← Always shown!
```

**Fix:**
```typescript
const [email, setEmail] = useState(
  import.meta.env.DEV ? 'test' : ''
)

{import.meta.env.DEV && (
  <Alert>Demo mode...</Alert>
)}
```

---

### 15. `create_all()` Runs in Production

**File:** `backend/app/main.py`

**Current:**
```python
Base.metadata.create_all(bind=engine)  # ← Unconditional!
```

**Risk:** Alembic migrations bypassed; schema conflicts

**Fix:**
```python
if settings.ENV != "production":
    Base.metadata.create_all(bind=engine)
# In prod: use Alembic only
```

---

### 16. Insecure `reset_password.py`

**File:** `backend/reset_password.py`

**Current:**
```python
new_password = "admin123"  # ← Hardcoded!
print(f"New password: {new_password}")  # ← Prints to console!
```

**Action:** DELETE or move to `scripts/dev/` with big warning

---

### 17. Project History - Duplicate Files

**Problem:** Two versions:
- ✅ API-backed version (good)
- ❌ Mock version with `mockProjectHistory`

**Risk:** Wrong version ships

**Action:** Remove mock version

---

### 18. Docs Reference Deleted Endpoint

**File:** `docs/Admin_Operating_Guide.md`

**Problem:** References `/api/v1/auth/seed-admin` (should be deleted)

**Action:** Scrub all docs

---

### 19. Upload Validation Missing

**Required:**
- Max file size (50MB)
- Magic bytes check:
  - PDF: `%PDF-`
  - IFC: `ISO-10303-21`
  - DWG/DXF: via `ezdxf` header logic

**Implementation:**
```python
MAX_SIZE = 50 * 1024 * 1024

@router.put("/{file_id}/content")
async def upload_content(file_id: str, request: Request, ...):
    content = await request.body()
    
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "File too large")
    
    # Get file type
    file = db.query(File).get(file_id)
    
    # Check magic bytes
    if file.type == 'PDF' and not content.startswith(b'%PDF-'):
        raise HTTPException(400, "Invalid PDF file")
    elif file.type == 'IFC' and b'ISO-10303-21' not in content[:100]:
        raise HTTPException(400, "Invalid IFC file")
    
    # Continue with upload...
```

---

### 20. DB Indexes Missing

**Required indexes:**
```sql
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_access_requests_email ON access_requests(email);
```

---

## 🟡 P2 MEDIUM (New Features - 4 Items)

### ❌ A) Access Request → Invite Link (P1)

**Status:** Backend missing, Frontend mocked

**Full Spec:** See Group 2 above (#8-11)

**Acceptance Criteria:**
- Admin clicks Approve → invite email sent
- User clicks link → sets password → auto-login
- Token expiry/reuse handled correctly

---

### ❌ B) Invite Collaborators (P2)

**Goal:** Multi-user projects with role-based access

**DB Schema:**
```sql
CREATE TABLE project_members (
    project_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    role VARCHAR NOT NULL,  -- 'owner', 'editor', 'viewer'
    added_at TIMESTAMP DEFAULT NOW(),
    invited_by VARCHAR,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE project_invites (
    id VARCHAR PRIMARY KEY,
    project_id VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    token VARCHAR UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    invited_by VARCHAR
);
```

**Endpoints:**
```python
POST   /projects/{id}/invites       # Owner invites teammate
GET    /projects/{id}/members       # List members
DELETE /projects/{id}/members/{uid} # Remove member
POST   /projects/accept-invite      # Accept invite (public)
```

**AuthZ Update:**
```python
# All project endpoints must check:
def verify_project_access(project_id, user_id, required_role='viewer'):
    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    
    if not membership:
        raise HTTPException(404, "Project not found")
    
    if required_role == 'owner' and membership.role != 'owner':
        raise HTTPException(403, "Owner access required")
    elif required_role == 'editor' and membership.role == 'viewer':
        raise HTTPException(403, "Editor access required")
```

**Frontend:**
- Project → Collaborators tab
- Invite dialog (email + role dropdown)
- Member list with actions

---

### ❌ C) Project Management + Notion Sync (P2)

**Goal:** Task/timeline view with optional Notion integration

**Architecture:**
```python
# services/notion.py
class NotionAdapter:
    def __init__(self):
        self.token = settings.NOTION_TOKEN
        self.db_id = settings.NOTION_DB_ID
        self.enabled = bool(self.token and self.db_id)
    
    def list_tasks(self, project_id):
        if self.enabled:
            # Fetch from Notion API
            return self._fetch_from_notion(project_id)
        else:
            # Fallback to local DB
            return db.query(PMTask).filter_by(project_id=project_id).all()
```

**Local DB:**
```sql
CREATE TABLE pm_tasks (
    id VARCHAR PRIMARY KEY,
    project_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    status VARCHAR,  -- 'todo', 'in_progress', 'done'
    assignee VARCHAR,
    due_date DATE,
    sort_order INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Endpoints:**
```python
GET    /projects/{id}/tasks
POST   /projects/{id}/tasks
PATCH  /projects/{id}/tasks/{task_id}
DELETE /projects/{id}/tasks/{task_id}
```

**Frontend:**
- Project → Tasks tab
- Table view + Kanban (optional)
- "Connect Notion" toggle in settings

---

### ❌ D) Demo Video on Landing (P3)

**Component:**
```typescript
interface DemoVideoProps {
  src: string
  poster?: string
  provider: 'youtube' | 'file'
}

export function DemoVideo({ src, poster, provider }: DemoVideoProps) {
  if (provider === 'youtube') {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${src}`}
        allow="accelerometer; autoplay; encrypted-media"
        loading="lazy"
      />
    )
  }
  
  return (
    <video
      src={src}
      poster={poster}
      controls
      muted
      playsInline
      loading="lazy"
    />
  )
}
```

**Usage:**
```typescript
// On landing pages
<DemoVideo
  src="demo-video-id"
  provider="youtube"
  poster="/assets/video-poster.jpg"
/>
```

---

## 🧪 COMPLETE TEST PLAN

### Pre-Deployment Checklist

#### Security Tests:

```bash
# 1. Admin backdoor deleted
curl -X POST https://app.yourdomain.com/api/v1/auth/seed-admin
# Expected: 404

# 2. Cross-tenant artifact access blocked
curl -H "Authorization: Bearer $USER_A_TOKEN" \
  -X POST /api/v1/artifacts/$USER_B_ARTIFACT_ID/presign
# Expected: 404

# 3. Cross-tenant file access blocked
curl -H "Authorization: Bearer $USER_A_TOKEN" \
  /api/v1/files/$USER_B_FILE_ID
# Expected: 404

# 4. Cross-tenant job export blocked
curl -H "Authorization: Bearer $USER_A_TOKEN" \
  -X POST /api/v1/jobs/$USER_B_JOB_ID/export?format=csv
# Expected: 404

# 5. Cross-tenant takeoff blocked
curl -H "Authorization: Bearer $USER_A_TOKEN" \
  /api/v1/jobs/$USER_B_JOB_ID/takeoff
# Expected: 404

# 6. Project presign requires ownership
curl -H "Authorization: Bearer $USER_A_TOKEN" \
  -X POST /api/v1/files/presign \
  -d '{"project_id": "$USER_B_PROJECT_ID"}'
# Expected: 404

# 7. Resend throttle works
curl -X POST /api/v1/auth/resend-verification -d '{"email": "test@test.com"}'
sleep 1
curl -X POST /api/v1/auth/resend-verification -d '{"email": "test@test.com"}'
# Expected: 429 "Try again in 59 seconds"

# 8. Atomic credits race test
# Launch 2 concurrent job creates with balance=210, cost=200
# Expected: One 201, one 402, balance=10 (never negative)
```

#### Feature Tests:

```bash
# 9. Access request → Invite flow
# Step 1: User submits request
POST /public/access-requests {name, email, company, message}
# Expected: 201

# Step 2: Admin approves
POST /admin/access-requests/{id}/approve
# Expected: 200 + email sent

# Step 3: User completes invite
POST /auth/complete-invite {token, password}
# Expected: 200 + JWT token

# Step 4: User logs in
POST /auth/login {email, password}
# Expected: 200 + JWT
```

#### Production Toggles:

```bash
# 10. create_all() not executed in prod
# Check logs: should NOT see "Creating tables..."

# 11. Demo content hidden
# Open /app/signin
# Should NOT see "Demo mode: use test"
# Email field should be empty by default
```

---

## 🔧 EXECUTION PLAN

### Phase 1: Critical Security Fixes (TODAY - 4 hours)

**Batch 1.1: Ownership Checks (90 min)**
- [ ] Fix artifacts presign/download
- [ ] Fix export BOQ + list artifacts
- [ ] Fix files get/presign/upload
- [ ] Fix takeoff endpoints + patch mapping

**Batch 1.2: Unify Credits Code (30 min)**
- [ ] Delete non-atomic version
- [ ] Keep conditional UPDATE version
- [ ] Verify in all dumps

**Batch 1.3: Production Toggles (30 min)**
- [ ] Guard create_all() in main.py
- [ ] Delete/restrict reset_password.py
- [ ] Guard Sign-In demo content

**Batch 1.4: Server Throttle (30 min)**
- [ ] Add last_verification_sent_at to User model
- [ ] Implement 60s throttle in resend endpoint
- [ ] Return 429 with countdown

**Batch 1.5: Testing (60 min)**
- [ ] Run security test suite
- [ ] Verify all cross-tenant blocks
- [ ] Test throttle
- [ ] Test atomic credits

---

### Phase 2: Invite Flow Implementation (TOMORROW - 3 hours)

**Batch 2.1: Backend (90 min)**
- [ ] Implement POST /admin/access-requests/{id}/approve
- [ ] Implement POST /auth/complete-invite
- [ ] Add invite email template
- [ ] Test token lifecycle

**Batch 2.2: Frontend (60 min)**
- [ ] Remove AccessRequestForm mocks
- [ ] Wire Admin UI to /approve
- [ ] Create CompleteInvite page
- [ ] Test end-to-end flow

**Batch 2.3: Testing (30 min)**
- [ ] Full approve→invite→complete flow
- [ ] Token expiry handling
- [ ] Duplicate request handling

---

### Phase 3: Code Cleanup (2 hours)

**Batch 3.1: Remove Duplicates (60 min)**
- [ ] Delete old jobs.py (non-atomic)
- [ ] Delete old takeoff.py (no ownership)
- [ ] Remove mock ProjectHistory
- [ ] Reconcile to single version

**Batch 3.2: Upload Validation (45 min)**
- [ ] Add file size check
- [ ] Add magic bytes validation
- [ ] Update Nginx config

**Batch 3.3: DB Indexes (15 min)**
- [ ] Create migration
- [ ] Add all FK indexes

---

### Phase 4: New Features (NEXT WEEK - 8 hours)

**P2-A: Invite Collaborators (4 hours)**
- DB schema + migration
- Backend endpoints
- Frontend UI
- AuthZ updates

**P2-B: Project Management (3 hours)**
- Notion adapter
- Local DB fallback
- Tasks endpoints
- Frontend tab

**P2-C: Demo Video (1 hour)**
- DemoVideo component
- Landing page integration
- Lazy loading

---

## 📊 PROGRESS TRACKING

### Must Complete Before Demo (30 Oct):

| Task | Priority | Status | ETA |
|------|----------|--------|-----|
| Ownership checks (7 endpoints) | P0 | ❌ | 90 min |
| Unify credits code | P0 | ❌ | 30 min |
| Production toggles | P0 | ❌ | 30 min |
| Server throttle | P0 | ❌ | 30 min |
| Invite flow backend | P1 | ❌ | 90 min |
| Invite flow frontend | P1 | ❌ | 60 min |
| Remove duplicates | P1 | ❌ | 60 min |

**Total Critical Path:** ~7 hours

---

## 🚦 GO/NO-GO CRITERIA

### GO Criteria (все должны быть ✅):

- [ ] All 7 ownership checks implemented
- [ ] Cross-tenant access returns 404 (tested)
- [ ] Atomic credits enforced (tested)
- [ ] Server throttle active (tested)
- [ ] Invite flow works end-to-end
- [ ] No duplicate/conflicting files
- [ ] Demo content guarded
- [ ] create_all() gated for prod

### Current Status: ❌ 0/8 criteria met

---

## 📝 COMMANDER'S FINAL NOTES

> "You've made real progress, but do not ship today with the current repo state. The mixed copies are dangerous. Fix the P0s and reconcile duplicates."

**Translation:** Code is half-good, half-dangerous. One deploy can pick wrong version → data breach.

**Action:** COMPLETE PHASE 1 TODAY. Then demo tomorrow is safe.

---

## 📁 FILES TO MODIFY

### High Priority (Phase 1):
```
backend/app/api/v1/endpoints/artifacts.py      ← Add ownership
backend/app/api/v1/endpoints/export.py         ← Add ownership
backend/app/api/v1/endpoints/files.py          ← Add ownership
backend/app/api/v1/endpoints/takeoff.py        ← Add ownership
backend/app/api/v1/endpoints/jobs.py           ← Use atomic version
backend/app/api/v1/endpoints/auth.py           ← Add throttle
backend/app/main.py                            ← Gate create_all()
apps/user-frontend/src/pages/SignIn.tsx        ← Guard demo
backend/reset_password.py                      ← DELETE
```

### Medium Priority (Phase 2):
```
backend/app/api/v1/endpoints/admin_access_requests.py  ← Add /approve
backend/app/api/v1/endpoints/auth.py                   ← Add /complete-invite
apps/user-frontend/src/components/AccessRequestForm.tsx ← Remove mocks
apps/admin-frontend/src/pages/AdminAccessRequests.tsx   ← Wire /approve
```

### Cleanup (Phase 3):
```
backend/app/api/v1/endpoints/projects.py (old)  ← DELETE
apps/user-frontend/src/pages/ProjectHistory.tsx (mock) ← DELETE
```

---

## ⏰ TIMELINE

**Today (29 Oct):**
- 14:00-18:00: Phase 1 (Critical fixes)
- 18:00-19:00: Testing Phase 1

**Tomorrow (30 Oct):**
- 09:00-12:00: Phase 2 (Invite flow)
- 12:00-13:00: Testing Phase 2
- 13:00-15:00: Phase 3 (Cleanup)
- 15:00: ✅ DEMO READY

**Next Week:**
- Phase 4 (New features)

---

## 🎯 SUCCESS METRICS

**Before:**
- ❌ 12 P0 security holes
- ❌ Data breach possible
- ❌ Demo will fail

**After Phase 1:**
- ✅ All ownership checks active
- ✅ Cross-tenant access blocked
- ✅ Atomic operations guaranteed
- ✅ Throttling prevents abuse

**After Phase 2:**
- ✅ Full invite flow working
- ✅ No mocks in production
- ✅ Professional UX

**After Phase 3:**
- ✅ Clean, unified codebase
- ✅ Upload validation active
- ✅ Performance optimized

---

## 🆘 EMERGENCY CONTACTS

If deployment fails:
1. Rollback to previous version
2. Check logs: `journalctl -u skybuild-api`
3. Run test suite
4. Contact Commander

---

**STATUS:** Ready to execute Phase 1
**NEXT STEP:** Begin Batch 1.1 (Ownership Checks)

