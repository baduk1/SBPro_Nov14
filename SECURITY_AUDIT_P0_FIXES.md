# 🔒 Security Audit & P0 Critical Fixes

## Дата: 29 октября 2025
## Статус: NO-GO для демо 30 октября (до исправления P0)

---

## 📊 Executive Summary

**Commander's Diagnostic**: Система имеет серьёзные security gaps, которые блокируют запуск в production.

**Прогресс:**
- ✅ Credits deduction atomic
- ✅ Refunds on failure  
- ✅ Job ownership verification
- ✅ Email service ready
- ⚠️ **5 КРИТИЧЕСКИХ P0 блокеров**

**GO/NO-GO:** ❌ **NO-GO** до исправления всех P0

---

## ❌ P0 BLOCKERS (Критические - MUST FIX)

### 1. 🚨 Admin Backdoor Still Present

**Impact:** КРИТИЧЕСКИЙ - Anyone can create admin in production

**Evidence:**
```python
# backend/app/api/v1/endpoints/auth.py
@router.post("/seed-admin")  # ← ЭТО BACKDOOR!
def seed_admin(...):
    ...
```

**Проблема:**
- Роут `/api/v1/auth/seed-admin` доступен публично
- Документирован в Admin Operating Guide
- Позволяет создать admin без авторизации

**Fix:**
```python
# DELETE entire route or:
if settings.ENV == "production":
    raise HTTPException(403, "Not available in production")
```

**Action:** DELETE route + keep only CLI `create_admin_user.py`

---

### 2. 🔌 Frontend Uses Mocked Flows

**Impact:** Admin Approve не работает, users не могут завершить регистрацию

**Evidence:**

**AccessRequestForm.tsx:**
```typescript
// MOCK localStorage/modal fallback
// Does NOT call POST /public/access-requests
```

**AdminAccessRequests.tsx:**
```typescript
// Only PATCHes status
// Does NOT call POST /admin/access-requests/{id}/approve
```

**Проблема:**
- Frontend не использует новые API endpoints
- Invite flow не работает end-to-end
- Mock data вместо реальных вызовов

**Fix:**
```typescript
// AccessRequestForm.tsx
await api.post('/public/access-requests', {
  name, email, company, message
})

// AdminAccessRequests.tsx  
await api.post(`/admin/access-requests/${id}/approve`)
```

---

### 3. ⏱️ Email Resend Throttle Missing

**Impact:** Spam/abuse risk, SendGrid overload

**Evidence:**
```python
# auth.py - NO throttle check!
@router.post("/resend-verification")
def resend_verification(email: str, db: Session = Depends(get_db)):
    # Immediately creates token and sends
    # No last_sent check, no rate limit
```

**Проблема:**
- Пользователь может спамить `/resend-verification`
- Нет 429 Too Many Requests
- Нет проверки "last sent < 60s"

**Fix:**
```python
# Add to User model
last_verification_sent_at = Column(DateTime, nullable=True)

# In resend_verification:
if user.last_verification_sent_at:
    delta = (datetime.utcnow() - user.last_verification_sent_at).total_seconds()
    if delta < 60:
        raise HTTPException(429, detail=f"Try again in {60-int(delta)}s")

# After send:
user.last_verification_sent_at = datetime.utcnow()
db.commit()
```

---

### 4. 🗂️ File Presign Missing Project Ownership Check

**Impact:** Tenant A can upload files to Tenant B's project

**Evidence:**
```python
# files.py - VULNERABILITY!
@router.post("/presign")
def create_presigned(...):
    f = File(
        project_id=payload.project_id,  # ← NO ownership check!
        user_id=user.id
    )
    # Attacker can use any project_id
```

**Проблема:**
- Нет проверки `project.owner_id == user.id`
- Cross-tenant file injection possible
- Security bypass

**Fix:**
```python
# BEFORE creating File:
project = db.query(Project).filter(
    Project.id == payload.project_id,
    Project.owner_id == user.id  # ← CRITICAL!
).first()

if not project:
    raise HTTPException(404, "Project not found")

# Then create File
```

---

### 5. 🎭 Sign-In Screen Shows Demo Content in Production

**Impact:** Unprofessional, leaks test data

**Evidence:**
```typescript
// SignIn.tsx
const [email, setEmail] = useState('test')  // ← Default!

{/* ALWAYS shows: */}
<Alert severity="info">
  Demo mode: use email <strong>"test"</strong> (any password)
</Alert>
```

**Проблема:**
- Demo alert показывается в production
- Default email = 'test'
- Выглядит непрофессионально

**Fix:**
```typescript
const [email, setEmail] = useState(
  import.meta.env.DEV ? 'test' : ''  // ← Only in dev
)

{import.meta.env.DEV && (  // ← Guard
  <Alert severity="info">
    Demo mode: use email <strong>"test"</strong>
  </Alert>
)}
```

---

## 🟠 P1 GAPS (Important - Fix ASAP)

### A. Approve→Invite Flow Half-Wired

**Good:** Backend implemented (`/approve`, `/complete-invite`, email templates)

**Missing:** Frontend doesn't call these endpoints

**Fix:** Wire FE to real APIs (covered in P0 #2)

---

### B. Project History Has Duplicate Files

**Problem:** Two versions exist:
- ✅ API-backed `ProjectHistory.tsx` (good)
- ❌ Mock version with `mockProjectHistory` (bad)

**Risk:** Wrong file can ship to production

**Fix:** Remove mock version, keep only API-backed

---

### C. Upload Validation Missing

**Missing:**
- File size limit enforcement
- Magic bytes checking (PDF: `%PDF-`, IFC: `ISO-10303-21`)
- Content-Type validation

**Fix:**
```python
# upload_content endpoint
MAX_SIZE = 50 * 1024 * 1024  # 50MB

if len(content) > MAX_SIZE:
    raise HTTPException(413, "File too large")

# Check magic bytes
if file_type == 'PDF' and not content.startswith(b'%PDF-'):
    raise HTTPException(400, "Invalid PDF file")
```

---

### D. Multiple Divergent File Versions

**Problem:** Repository contains duplicates:
- Old `jobs.py` (non-atomic credits) vs New (atomic)
- Old `takeoff.py` (no ownership) vs New (with check)

**Risk:** Build can pick wrong version

**Fix:** Delete all old versions, keep only hardened ones

---

### E. Reset Password Script Insecure

**Evidence:**
```python
# reset_password.py
print(f"New password: {plaintext}")  # ← INSECURE!
```

**Fix:** Delete file, use `create_admin_user.py` pattern

---

## 🟡 P2 (Quality/Performance)

- **DB Indexes:** Add indexes for all FK columns (user_id, owner_id, etc.)
- **CORS:** Verify prod uses only real origins (no localhost)
- **Landing Pages:** Three exist, decide default for Oct-30

---

## 🔧 PATCH CHECKLIST (Execution Order)

### Priority 1 (TODAY - блокеры безопасности):

- [ ] **P0-1:** Delete `/auth/seed-admin` route
- [ ] **P0-2:** Wire frontend Approve → `/approve` endpoint
- [ ] **P0-2:** Wire AccessRequestForm → `/public/access-requests`
- [ ] **P0-3:** Add resend throttle (60s, 429)
- [ ] **P0-4:** Add project ownership check in presign
- [ ] **P0-5:** Guard Sign-In demo UI behind `import.meta.env.DEV`

### Priority 2 (ASAP):

- [ ] **P1-B:** Remove mock ProjectHistory
- [ ] **P1-C:** Add upload validation (size + magic bytes)
- [ ] **P1-D:** Delete old file versions
- [ ] **P1-E:** Delete `reset_password.py`

### Priority 3 (Before production):

- [ ] **P2:** Add DB indexes
- [ ] **P2:** Verify CORS config
- [ ] **P2:** Choose default landing page

---

## 🧪 TEST PLAN (Post-Patch)

### Test 1: Backdoor Probe
```bash
curl -X POST https://skybuildpro.co.uk/api/v1/auth/seed-admin
# Expected: 404 Not Found (route deleted)
```

### Test 2: Access Request → Approve → Invite
1. User submits form → Check `POST /public/access-requests` in Network tab
2. Admin clicks Approve → Check `POST /admin/access-requests/{id}/approve`
3. User clicks email link → `/auth/complete-invite?token=...`
4. Set password → Login succeeds

### Test 3: Resend Throttle
```bash
# Call twice within 60s
POST /auth/resend-verification (email=test@test.com)
POST /auth/resend-verification (email=test@test.com)
# Expected: Second call returns 429 with countdown
```

### Test 4: Upload Presign Security
```bash
# Try to use someone else's project_id
POST /files/presign (project_id=<other_user_project>)
# Expected: 404 Project not found

# Upload corrupt file
PUT /files/{id}/content (body: garbage data)
# Expected: 400 Invalid file format
```

### Test 5: Atomic Credits
```bash
# Two rapid job creates with balance=210, cost=200 each
POST /jobs (file_id=xxx) → 201 Created
POST /jobs (file_id=yyy) → 402 Insufficient credits
# Balance should be 10, never negative
```

---

## 📈 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Credits atomic | ✅ Done | Tested |
| Refunds on failure | ✅ Done | Implemented |
| Ownership checks | ⚠️ Partial | Missing in presign |
| Email service | ✅ Done | SMTP configured |
| Invite flow (BE) | ✅ Done | Endpoints ready |
| Invite flow (FE) | ❌ Missing | Still mocked |
| Admin backdoor | ❌ CRITICAL | Still present |
| Resend throttle | ❌ CRITICAL | Not implemented |
| Demo content | ❌ CRITICAL | Shows in prod |

---

## 🚫 WHY NO-GO RIGHT NOW

1. **Admin backdoor** = compromised system
2. **Frontend mocked** = invite flow broken
3. **No throttle** = abuse/spam
4. **Presign gap** = cross-tenant injection
5. **Demo artifacts** = unprofessional

---

## ⏱️ EXECUTION ORDER (Today)

### Batch 1 (30 min):
1. Delete `/auth/seed-admin`
2. Delete `reset_password.py`

### Batch 2 (1 hour):
3. Add resend throttle
4. Add project ownership check in presign

### Batch 3 (1.5 hours):
5. Wire frontend Approve button
6. Wire AccessRequestForm
7. Guard Sign-In demo UI

### Batch 4 (30 min):
8. Add upload validation
9. Remove duplicate files

### Batch 5 (Testing):
10. Run test plan
11. Verify all P0s fixed

**Total:** ~3.5 hours to GO status

---

## 📝 Notes from Commander

> "You advanced significantly: the backend invite mechanics, ownership enforcement, and credit safety are largely there. But you're one backdoor and two half-wired flows away from a face-plant."

**Translation:** Система почти готова, но есть критические дыры безопасности.

---

## ✅ Next Steps

Waiting for Part 2 of technical specification, then:

1. Execute Batch 1-5 fixes
2. Run full test plan
3. Document all changes
4. Report GO/NO-GO status

**Target:** GO status к концу сегодняшнего дня (29 октября)

