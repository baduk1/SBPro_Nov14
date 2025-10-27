# 🔄 SkyBuild Pro - Complete User Flow Trace

**Generated:** 2025-10-25  
**Author:** Full system analysis  
**Version:** Production (Commit 1e57d57d)

---

## 📋 Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Flow 1: New User Registration & Verification](#flow-1-new-user-registration--verification)
3. [Flow 2: User Login](#flow-2-user-login)
4. [Flow 3: Project Creation](#flow-3-project-creation)
5. [Flow 4: File Upload (IFC/DWG/DXF)](#flow-4-file-upload-ifcdwgdxf)
6. [Flow 5: Job Processing](#flow-5-job-processing)
7. [Flow 6: BOQ Generation & Viewing](#flow-6-boq-generation--viewing)
8. [Flow 7: Price Application](#flow-7-price-application)
9. [Flow 8: Export & Download](#flow-8-export--download)
10. [Flow 9: Estimates & Templates](#flow-9-estimates--templates)
11. [Database Schema](#database-schema)
12. [Security & Multi-Tenancy](#security--multi-tenancy)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                             │
│  https://skybuildpro.co.uk                                  │
│  (React + TypeScript + MUI + Vite)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS (Nginx)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                    │
│  - Serves static files (/var/www/skybuild_user/)           │
│  - Proxies /api/ → localhost:8000                           │
│  - SSL termination, rate limiting, security headers         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  BACKEND API (FastAPI)                      │
│  - Python 3.11 + Uvicorn                                    │
│  - JWT Authentication (Bearer tokens)                       │
│  - Multi-tenant data isolation                              │
│  - Credits system & billing                                 │
│  Port: 8000 (localhost)                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┬───────────────┐
        │                             │               │
┌───────▼──────────┐  ┌───────────────▼──┐  ┌────────▼──────┐
│   PostgreSQL     │  │   File Storage   │  │   SendGrid    │
│   Database       │  │   (./storage)    │  │   (SMTP)      │
│   skybuild_pro   │  │   - uploads/     │  │   Email       │
│                  │  │   - artifacts/   │  │   Service     │
└──────────────────┘  └──────────────────┘  └───────────────┘
```

**Tech Stack:**
- **Frontend:** React 18, TypeScript, Material-UI v6, React Router v7, Axios
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Pydantic v2
- **Auth:** JWT (HS256), bcrypt password hashing
- **Email:** SendGrid SMTP
- **File Processing:** IFCOpenShell, ezdxf (DWG/DXF), PyPDF2
- **Deployment:** Nginx, SystemD, Ubuntu 22.04

---

## Flow 1: New User Registration & Verification

### 🎯 Goal: New user signs up and verifies email

### Frontend Flow

**Page:** `/app/register` → `SignIn.tsx` (register mode)

```typescript
// apps/user-frontend/src/pages/SignIn.tsx
```

**User Actions:**
1. User navigates to `https://skybuildpro.co.uk/app/register`
2. Enters:
   - Email address
   - Password (min 8 chars)
   - Full name (optional)
3. Clicks "Register" button

**API Call:**
```typescript
// apps/user-frontend/src/services/api.ts
const result = await auth.register(email, password, fullName)

// HTTP Request:
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "full_name": "John Doe"
}
```

### Backend Processing

**Endpoint:** `POST /api/v1/auth/register`  
**File:** `backend/app/api/v1/endpoints/auth.py`

```python
@router.post("/register", response_model=UserOut)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # Step 1: Check if user already exists
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")
    
    # Step 2: Hash password (bcrypt)
    hashed_password = get_password_hash(payload.password)
    
    # Step 3: Create user in database
    user = User(
        email=payload.email,
        hash=hashed_password,
        full_name=payload.full_name,
        role=UserRole.USER.value,
        email_verified=False,  # Not verified yet!
        credits_balance=1000   # Free starting credits
    )
    db.add(user)
    db.flush()
    
    # Step 4: Create email verification token
    verification_token = EmailVerificationToken.create_token_with_expiry(
        user_id=user.id,
        hours=24  # Valid for 24 hours
    )
    db.add(verification_token)
    db.commit()
    
    # Step 5: Send verification email via SendGrid
    send_verification_email(
        to_email=user.email,
        verification_token=verification_token.token,
        user_name=user.full_name
    )
    # Email contains link: https://skybuildpro.co.uk/verify-email?token=...
    
    return user
```

**Database Operations:**
```sql
-- 1. Insert new user
INSERT INTO users (id, email, hash, full_name, role, email_verified, credits_balance)
VALUES (uuid, 'user@example.com', '$2b$12...', 'John Doe', 'user', false, 1000);

-- 2. Insert verification token
INSERT INTO email_verification_tokens (id, user_id, token, expires_at, used_at)
VALUES (uuid, user_id, 'generated_token_hash', NOW() + INTERVAL '24 hours', NULL);
```

**Email Sent (SendGrid):**
```
To: user@example.com
From: noreply@skybuildpro.co.uk
Subject: Verify your email - SkyBuild Pro

Hi John Doe,

Welcome to SkyBuild Pro! Please verify your email address:

[Verify Email Button] → https://skybuildpro.co.uk/verify-email?token=ABC123...

This link expires in 24 hours.
```

### Email Verification Flow

**User Action:** Clicks verification link in email

**Frontend:**
```typescript
// apps/user-frontend/src/pages/VerifyEmail.tsx
const token = searchParams.get('token')  // From URL query
const result = await auth.verifyEmail(token)

// HTTP Request:
POST /api/v1/auth/verify-email?token=ABC123...
```

**Backend:**
```python
@router.post("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    # Find verification token
    verification = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token
    ).first()
    
    if not verification:
        raise HTTPException(400, "Invalid verification token")
    
    if verification.used_at:
        raise HTTPException(400, "Verification token already used")
    
    if verification.expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "Verification token expired")
    
    # Mark user as verified
    user = db.query(User).filter(User.id == verification.user_id).first()
    user.email_verified = True
    verification.used_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {"message": "Email verified successfully", "email": user.email}
```

**Database:**
```sql
-- Update user
UPDATE users SET email_verified = true WHERE id = user_id;

-- Mark token as used
UPDATE email_verification_tokens SET used_at = NOW() WHERE token = 'ABC123...';
```

---

## Flow 2: User Login

### 🎯 Goal: Verified user logs in and gets JWT token

**Page:** `/app/signin` → `SignIn.tsx`

**User Actions:**
1. Enters email and password
2. Clicks "Sign In"

**Frontend:**
```typescript
// API Call
const { access_token } = await auth.login(email, password)

// Store token in localStorage
localStorage.setItem('token', access_token)

// Redirect to dashboard
navigate('/app')

// HTTP Request:
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=SecurePass123
```

**Backend:**
```python
@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Step 1: Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # Step 2: Verify password (bcrypt)
    if not user or not verify_password(form_data.password, user.hash):
        raise HTTPException(400, "Incorrect email or password")
    
    # Step 3: Check email verified (SECURITY!)
    if not user.email_verified and user.role != UserRole.ADMIN.value:
        raise HTTPException(403, "Please verify your email before logging in")
    
    # Step 4: Create JWT token
    token_data = {"sub": user.id}  # Subject = user ID
    token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)  # 24 hours
    )
    
    return Token(access_token=token)
```

**JWT Token Structure:**
```json
{
  "sub": "user-uuid-here",
  "exp": 1729900800  // Expiration timestamp (24 hours from now)
}
```

**Token signed with:** `SECRET_KEY` using HS256 algorithm

**Frontend Token Usage:**
```typescript
// Axios interceptor automatically adds token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

---

## Flow 3: Project Creation

### 🎯 Goal: User creates a project to organize files

**Page:** `/app` → `Dashboard.tsx`

**User Actions:**
1. On dashboard, clicks "Create Project"
2. Enters project details:
   - Name: "Apartment Building A"
   - Address: "123 Main St, London"
   - Description: "5-story residential building"

**Frontend:**
```typescript
// Not shown in api.ts but follows pattern
POST /api/v1/projects
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Apartment Building A",
  "address": "123 Main St, London",
  "description": "5-story residential building"
}
```

**Backend:**
```python
# backend/app/api/v1/endpoints/projects.py

@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectIn, db: Session = Depends(get_db), 
                   user: User = Depends(get_current_user)):
    # Create project owned by current user
    project = Project(
        name=payload.name,
        address=payload.address,
        description=payload.description,
        owner_id=user.id,  # MULTI-TENANT: Links project to user
        status="active"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return project
```

**Database:**
```sql
INSERT INTO projects (id, name, address, description, owner_id, status, created_at)
VALUES (
  uuid,
  'Apartment Building A',
  '123 Main St, London',
  '5-story residential building',
  'user-uuid',
  'active',
  NOW()
);
```

**Multi-Tenant Isolation:**
- Every project has `owner_id` linking to `users.id`
- Users can ONLY see/edit their own projects
- Backend enforces: `filter(Project.owner_id == user.id)`

---

## Flow 4: File Upload (IFC/DWG/DXF)

### 🎯 Goal: User uploads construction file for processing

**Page:** `/app/upload` or project detail page

### Step 1: Request Presigned Upload URL

**User Action:** Selects file from computer

**Frontend:**
```typescript
// apps/user-frontend/src/components/FileUpload.tsx

const file = event.target.files[0]  // User selected file
const fileType = detectFileType(file.name)  // IFC, DWG, DXF, PDF

// Step 1: Get presigned URL
const { file_id, upload_url } = await uploads.presign(
  projectId,
  file.name,
  file.type,
  fileType
)

// HTTP Request:
POST /api/v1/files
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "project_id": "project-uuid",
  "filename": "building.ifc",
  "file_type": "IFC",
  "content_type": "application/octet-stream"
}
```

**Backend:**
```python
# backend/app/api/v1/endpoints/files.py

@router.post("", response_model=PresignedUpload)
def create_file_upload(payload: FileUpload, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)):
    # Validate file type
    if payload.file_type not in settings.ALLOWED_UPLOAD_TYPES:
        raise HTTPException(400, f"File type {payload.file_type} not allowed")
    
    # Verify project ownership (MULTI-TENANT SECURITY!)
    project = db.query(Project).filter(
        Project.id == payload.project_id,
        Project.owner_id == user.id  # User must own the project!
    ).first()
    
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Create file record
    file_obj = File(
        project_id=payload.project_id,
        user_id=user.id,  # MULTI-TENANT: Link to user
        filename=payload.filename,
        file_type=payload.file_type,
        size=0,  # Will be updated after upload
        status="uploading"
    )
    db.add(file_obj)
    db.commit()
    
    # Generate presigned upload URL
    file_path = f"uploads/{file_obj.id}"
    upload_url = generate_presigned_upload_url(file_path, payload.content_type)
    
    return PresignedUpload(
        file_id=file_obj.id,
        upload_url=upload_url
    )
```

**Database:**
```sql
INSERT INTO files (id, project_id, user_id, filename, file_type, size, status, created_at)
VALUES (
  uuid,
  'project-uuid',
  'user-uuid',
  'building.ifc',
  'IFC',
  0,
  'uploading',
  NOW()
);
```

### Step 2: Upload File to Storage

**Frontend:**
```typescript
// Step 2: Upload file directly to storage (presigned URL)
await axios.put(upload_url, file, {
  headers: {
    'Content-Type': file.type
  },
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
    setUploadProgress(percentCompleted)
  }
})

// Step 3: Notify backend upload complete
PUT /api/v1/files/{file_id}/content
Authorization: Bearer <jwt_token>
```

**Backend:**
```python
@router.put("/{file_id}/content")
def finalize_upload(file_id: str, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    # Get file record (with ownership check!)
    file_obj = db.query(File).filter(
        File.id == file_id,
        File.user_id == user.id  # MULTI-TENANT SECURITY!
    ).first()
    
    if not file_obj:
        raise HTTPException(404, "File not found")
    
    # Get actual file size from storage
    file_path = storage.get_path(f"uploads/{file_id}")
    file_obj.size = os.path.getsize(file_path)
    file_obj.status = "uploaded"
    
    db.commit()
    
    return {"message": "Upload completed"}
```

**File Storage:**
```
/root/skybuild_o1_production/backend/storage/uploads/
  └── <file-uuid>  (raw IFC/DWG/DXF file)
```

---

## Flow 5: Job Processing

### 🎯 Goal: Create processing job to extract quantities from file

**User Action:** After file upload, user clicks "Create Job" or "Process File"

### Step 1: Create Job

**Frontend:**
```typescript
// Create job for the uploaded file
const job = await jobs.create(projectId, fileId, 'IFC')

// HTTP Request:
POST /api/v1/jobs
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "project_id": "project-uuid",
  "file_id": "file-uuid",
  "file_type": "IFC"
}
```

**Backend:**
```python
# backend/app/api/v1/endpoints/jobs.py

@router.post("", response_model=JobOut)
def create_job(payload: JobIn, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    # STEP 1: Verify file ownership (MULTI-TENANT!)
    file_obj = db.query(File).filter(
        File.id == payload.file_id,
        File.user_id == user.id  # User must own the file!
    ).first()
    
    if not file_obj:
        raise HTTPException(404, "File not found")
    
    # STEP 2: Check user has enough credits
    cost = settings.COST_PER_JOB  # Default: 200 credits
    if user.credits_balance < cost:
        raise HTTPException(402, f"Insufficient credits. Need {cost}, have {user.credits_balance}")
    
    # STEP 3: Deduct credits IMMEDIATELY (atomic transaction!)
    user.credits_balance -= cost
    
    # STEP 4: Create job
    job = Job(
        project_id=payload.project_id,
        file_id=payload.file_id,
        user_id=user.id,  # MULTI-TENANT: Link to user
        status=JobStatus.QUEUED.value,
        progress=0
    )
    db.add(job)
    
    # STEP 5: Create initial event
    event = JobEvent(
        job_id=job.id,
        event_type="created",
        message="Job created and queued for processing"
    )
    db.add(event)
    
    db.commit()
    
    # STEP 6: Start background processing
    process_job_async(job.id, file_obj, db)
    
    return job
```

**Database:**
```sql
-- Deduct credits from user
UPDATE users SET credits_balance = credits_balance - 200 WHERE id = 'user-uuid';

-- Create job
INSERT INTO jobs (id, project_id, file_id, user_id, status, progress, created_at)
VALUES (uuid, 'project-uuid', 'file-uuid', 'user-uuid', 'QUEUED', 0, NOW());

-- Create job event
INSERT INTO job_events (id, job_id, event_type, message, created_at)
VALUES (uuid, 'job-uuid', 'created', 'Job created and queued for processing', NOW());
```

### Step 2: Background Processing

**Backend Processing Service:**
```python
# backend/app/services/jobs.py

def process_job_async(job_id: str, file_obj: File, db: Session):
    """Background job processing"""
    
    try:
        # Update status to PROCESSING
        job.status = JobStatus.PROCESSING.value
        db.commit()
        
        # Emit event
        emit_sse_event(job_id, {
            "type": "status_update",
            "status": "PROCESSING",
            "progress": 10,
            "message": "Starting file analysis..."
        })
        
        # STEP 1: Read file based on type
        file_path = storage.get_path(f"uploads/{file_obj.id}")
        
        if file_obj.file_type == "IFC":
            # Use IFCOpenShell to parse IFC file
            from app.services.takeoff.ifc_takeoff import process_ifc
            elements = process_ifc(file_path)
            
        elif file_obj.file_type == "DWG" or file_obj.file_type == "DXF":
            # Use ezdxf to parse DWG/DXF
            from app.services.takeoff.dwg_takeoff import process_dwg
            elements = process_dwg(file_path)
        
        emit_sse_event(job_id, {
            "progress": 40,
            "message": f"Found {len(elements)} elements"
        })
        
        # STEP 2: Load mapping rules
        mapping = load_mapping_yaml("storage/config/mapping.yml")
        
        # STEP 3: Match elements to BOQ categories
        boq_items = []
        for element in elements:
            category = mapping.match(element.type, element.properties)
            if category:
                boq_item = BoqItem(
                    job_id=job_id,
                    element_type=element.type,
                    description=category.description,
                    unit=category.unit,
                    quantity=calculate_quantity(element, category),
                    unit_price=None,  # Not yet priced
                    total_price=None,
                    currency="GBP",
                    source_ref=element.global_id
                )
                boq_items.append(boq_item)
        
        emit_sse_event(job_id, {
            "progress": 80,
            "message": f"Generated {len(boq_items)} BOQ items"
        })
        
        # STEP 4: Save to database
        db.bulk_save_objects(boq_items)
        
        # STEP 5: Mark job as completed
        job.status = JobStatus.COMPLETED.value
        job.progress = 100
        
        event = JobEvent(
            job_id=job_id,
            event_type="completed",
            message=f"Job completed successfully. Generated {len(boq_items)} items"
        )
        db.add(event)
        db.commit()
        
        emit_sse_event(job_id, {
            "type": "completed",
            "progress": 100,
            "message": "Processing complete!"
        })
        
    except Exception as e:
        # On error: REFUND credits! (CRITICAL!)
        user.credits_balance += settings.COST_PER_JOB
        
        job.status = JobStatus.FAILED.value
        event = JobEvent(
            job_id=job_id,
            event_type="failed",
            message=f"Error: {str(e)}"
        )
        db.add(event)
        db.commit()
        
        emit_sse_event(job_id, {
            "type": "failed",
            "message": str(e)
        })
```

**Database:**
```sql
-- Update job status
UPDATE jobs SET status = 'PROCESSING', progress = 10 WHERE id = 'job-uuid';

-- Insert BOQ items
INSERT INTO boq_items (id, job_id, element_type, description, unit, quantity, source_ref)
VALUES 
  (uuid, 'job-uuid', 'Wall', 'Concrete Wall 200mm', 'm²', 145.5, 'ifc-guid-1'),
  (uuid, 'job-uuid', 'Slab', 'Floor Slab 150mm', 'm²', 230.8, 'ifc-guid-2'),
  (uuid, 'job-uuid', 'Column', 'RC Column 300x300', 'pcs', 12, 'ifc-guid-3'),
  ...;

-- Mark complete
UPDATE jobs SET status = 'COMPLETED', progress = 100 WHERE id = 'job-uuid';

INSERT INTO job_events (id, job_id, event_type, message, created_at)
VALUES (uuid, 'job-uuid', 'completed', 'Job completed successfully', NOW());
```

### Step 3: Real-Time Updates (SSE)

**Frontend subscribes to Server-Sent Events:**
```typescript
// apps/user-frontend/src/pages/JobStatus.tsx

const eventSource = new EventSource(`/api/v1/jobs/${jobId}/stream`)

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  if (data.type === 'status_update') {
    setProgress(data.progress)
    setMessage(data.message)
  } else if (data.type === 'completed') {
    setJobStatus('COMPLETED')
    eventSource.close()
  } else if (data.type === 'failed') {
    setJobStatus('FAILED')
    setError(data.message)
    eventSource.close()
  }
}
```

**Backend SSE Endpoint:**
```python
@router.get("/{id}/stream")
async def stream_job_events(id: str, user: User = Depends(get_current_user)):
    # Verify job ownership
    job = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(404)
    
    async def event_generator():
        while True:
            # Check for new events
            events = get_pending_events(id)
            for event in events:
                yield f"data: {json.dumps(event)}\n\n"
            
            if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                break
            
            await asyncio.sleep(1)  # Poll every second
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

## Flow 6: BOQ Generation & Viewing

### 🎯 Goal: View extracted Bill of Quantities

**Page:** `/app/jobs/{jobId}/takeoff` → `TakeoffPreview.tsx`

**Frontend:**
```typescript
// Get BOQ items for job
const boqItems = await jobs.takeoff(jobId)

// HTTP Request:
GET /api/v1/jobs/{job-uuid}/takeoff
Authorization: Bearer <jwt_token>
```

**Backend:**
```python
# backend/app/api/v1/endpoints/takeoff.py

@router.get("/{id}/takeoff", response_model=List[BoqItemOut])
def get_takeoff(id: str, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    # Verify job ownership (MULTI-TENANT!)
    job = db.query(Job).filter(
        Job.id == id,
        Job.user_id == user.id  # Security check!
    ).first()
    
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Get all BOQ items for this job
    items = db.query(BoqItem).filter(BoqItem.job_id == id).all()
    
    return items
```

**Response:**
```json
[
  {
    "id": "item-uuid-1",
    "job_id": "job-uuid",
    "element_type": "Wall",
    "description": "Concrete Wall 200mm",
    "unit": "m²",
    "quantity": 145.5,
    "unit_price": null,
    "total_price": null,
    "currency": "GBP",
    "source_ref": "ifc-guid-1"
  },
  {
    "id": "item-uuid-2",
    "job_id": "job-uuid",
    "element_type": "Slab",
    "description": "Floor Slab 150mm",
    "unit": "m²",
    "quantity": 230.8,
    "unit_price": null,
    "total_price": null,
    "currency": "GBP",
    "source_ref": "ifc-guid-2"
  },
  ...
]
```

**Frontend Rendering:**
```typescript
// Display in DataGrid (Material-UI)
<DataGrid
  rows={boqItems}
  columns={[
    { field: 'element_type', headerName: 'Type', width: 120 },
    { field: 'description', headerName: 'Description', width: 300 },
    { field: 'unit', headerName: 'Unit', width: 80 },
    { field: 'quantity', headerName: 'Quantity', width: 120, type: 'number' },
    { field: 'unit_price', headerName: 'Unit Price', width: 120 },
    { field: 'total_price', headerName: 'Total', width: 120 }
  ]}
/>
```

---

## Flow 7: Price Application

### 🎯 Goal: Apply prices to BOQ items from supplier or price list

**User Action:** Clicks "Apply Prices" and selects supplier

**Frontend:**
```typescript
// Apply prices from supplier
await jobs.applyPrices(jobId, supplierId)

// OR apply from global price list
await jobs.applyPrices(jobId, undefined, priceListId)

// HTTP Request:
POST /api/v1/jobs/{job-uuid}/apply-prices
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "supplier_id": "supplier-uuid"
}
```

**Backend:**
```python
# backend/app/api/v1/endpoints/pricing.py

@router.post("/{id}/apply-prices", response_model=List[BoqItemOut])
def apply_prices(id: str, payload: PriceApplication,
                 db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    # Verify job ownership
    job = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(404)
    
    # Get all BOQ items
    boq_items = db.query(BoqItem).filter(BoqItem.job_id == id).all()
    
    # Get price items from supplier or price list
    if payload.supplier_id:
        # Verify supplier ownership
        supplier = db.query(Supplier).filter(
            Supplier.id == payload.supplier_id,
            Supplier.user_id == user.id  # MULTI-TENANT!
        ).first()
        if not supplier:
            raise HTTPException(404, "Supplier not found")
        
        price_items = db.query(SupplierPriceItem).filter(
            SupplierPriceItem.supplier_id == supplier.id,
            SupplierPriceItem.is_active == True
        ).all()
    else:
        # Use global price list (admin-managed)
        price_list = db.query(PriceList).filter(
            PriceList.is_active == True
        ).first()
        price_items = db.query(PriceItem).filter(
            PriceItem.price_list_id == price_list.id,
            PriceItem.is_active == True
        ).all()
    
    # Create price lookup dictionary
    price_dict = {item.code: item.price for item in price_items}
    
    # Match BOQ items to prices
    matched = 0
    for boq_item in boq_items:
        # Try to match by code (fuzzy matching)
        matching_code = find_matching_code(boq_item.description, price_dict.keys())
        
        if matching_code:
            boq_item.unit_price = price_dict[matching_code]
            boq_item.total_price = boq_item.quantity * boq_item.unit_price
            matched += 1
    
    db.commit()
    
    # Create event
    event = JobEvent(
        job_id=id,
        event_type="prices_applied",
        message=f"Applied prices to {matched}/{len(boq_items)} items"
    )
    db.add(event)
    db.commit()
    
    return boq_items
```

**Database:**
```sql
-- Update BOQ items with prices
UPDATE boq_items
SET 
  unit_price = 45.50,
  total_price = quantity * 45.50
WHERE id = 'item-uuid-1';

-- Create event
INSERT INTO job_events (id, job_id, event_type, message, created_at)
VALUES (uuid, 'job-uuid', 'prices_applied', 'Applied prices to 85/120 items', NOW());
```

---

## Flow 8: Export & Download

### 🎯 Goal: Export BOQ to CSV/Excel/PDF

**User Action:** Clicks "Export" and selects format (CSV, XLSX, or PDF)

**Frontend:**
```typescript
// Request export
const artifact = await jobs.export(jobId, 'xlsx')

// artifact = { id: 'artifact-uuid', job_id: 'job-uuid', kind: 'boq.xlsx', path: '...' }

// Get download URL
const { url } = await artifacts.presign(artifact.id)

// Download file
window.open(url, '_blank')
```

**Backend:**
```python
# backend/app/api/v1/endpoints/export.py

@router.post("/{id}/export", response_model=ArtifactOut)
def export_boq(id: str, format: str, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    # Verify job ownership
    job = db.query(Job).filter(Job.id == id, Job.user_id == user.id).first()
    if not job:
        raise HTTPException(404)
    
    # Get BOQ items
    items = db.query(BoqItem).filter(BoqItem.job_id == id).all()
    
    # Generate export file
    if format == 'csv':
        file_path = export_to_csv(items, job.id)
    elif format == 'xlsx':
        file_path = export_to_xlsx(items, job.id)
    elif format == 'pdf':
        file_path = export_to_pdf(items, job.id)
    else:
        raise HTTPException(400, "Invalid format")
    
    # Create artifact record
    artifact = Artifact(
        job_id=id,
        kind=f"boq.{format}",
        path=file_path,
        size=os.path.getsize(file_path)
    )
    db.add(artifact)
    db.commit()
    
    return artifact

# Download presigned URL
@router.post("/{id}/presign")
def presign_artifact(id: str, db: Session = Depends(get_db),
                     user: User = Depends(get_current_user)):
    # Get artifact (with job ownership check!)
    artifact = db.query(Artifact).join(Job).filter(
        Artifact.id == id,
        Job.user_id == user.id  # MULTI-TENANT SECURITY!
    ).first()
    
    if not artifact:
        raise HTTPException(404)
    
    # Generate presigned download URL (valid for 15 minutes)
    download_url = generate_presigned_download_url(artifact.path, ttl=900)
    
    return {"url": download_url}
```

**File Storage:**
```
/root/skybuild_o1_production/backend/storage/artifacts/
  ├── {job-uuid}_boq.csv
  ├── {job-uuid}_boq.xlsx
  └── {job-uuid}_boq.pdf
```

---

## Flow 9: Estimates & Templates

### Templates

**Purpose:** Reusable BOQ templates for common building types

**User Creates Template:**
```python
POST /api/v1/templates
{
  "name": "Standard Apartment",
  "category": "Residential",
  "items": [
    {"element_type": "Wall", "unit": "m²", "quantity_multiplier": 1.0},
    {"element_type": "Slab", "unit": "m²", "quantity_multiplier": 1.0},
    ...
  ]
}
```

**Apply Template to Job:**
```python
POST /api/v1/templates/apply
{
  "template_id": "template-uuid",
  "job_id": "job-uuid"
}

# Backend creates/updates BOQ items based on template
```

### Estimates

**Purpose:** Full cost estimates with adjustments (tax, overhead, profit)

**Create Estimate from Job:**
```python
POST /api/v1/estimates
{
  "name": "Building A - Final Estimate",
  "job_id": "job-uuid",
  "items": [...],  # From BOQ
  "adjustments": [
    {"name": "VAT", "adjustment_type": "percentage", "value": 20},
    {"name": "Overhead", "adjustment_type": "percentage", "value": 15},
    {"name": "Profit", "adjustment_type": "percentage", "value": 10}
  ]
}

# Backend calculates:
# - Subtotal: Sum of all items
# - Adjustments applied
# - Total: Final price including all adjustments
```

---

## Database Schema

### Core Tables

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    hash VARCHAR NOT NULL,  -- bcrypt hashed password
    full_name VARCHAR,
    role VARCHAR DEFAULT 'user',  -- 'user' or 'admin'
    email_verified BOOLEAN DEFAULT FALSE,
    credits_balance INTEGER DEFAULT 1000,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Email Verification Tokens
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token VARCHAR UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Projects (Multi-tenant)
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users(id) NOT NULL,  -- MULTI-TENANT KEY!
    name VARCHAR NOT NULL,
    address TEXT,
    description TEXT,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Files (Multi-tenant)
CREATE TABLE files (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    user_id UUID REFERENCES users(id) NOT NULL,  -- MULTI-TENANT KEY!
    filename VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL,  -- IFC, DWG, DXF, PDF
    size BIGINT DEFAULT 0,
    status VARCHAR DEFAULT 'uploading',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Jobs (Multi-tenant)
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    file_id UUID REFERENCES files(id),
    user_id UUID REFERENCES users(id) NOT NULL,  -- MULTI-TENANT KEY!
    status VARCHAR DEFAULT 'QUEUED',  -- QUEUED, PROCESSING, COMPLETED, FAILED
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Job Events (for progress tracking)
CREATE TABLE job_events (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES jobs(id),
    event_type VARCHAR NOT NULL,  -- created, processing, completed, failed
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- BOQ Items (Multi-tenant through job)
CREATE TABLE boq_items (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) NOT NULL,
    element_type VARCHAR NOT NULL,
    description TEXT,
    unit VARCHAR NOT NULL,
    quantity NUMERIC(12,3) NOT NULL,
    unit_price NUMERIC(12,2),
    total_price NUMERIC(12,2),
    currency VARCHAR DEFAULT 'GBP',
    source_ref VARCHAR,  -- IFC GlobalId or DWG handle
    created_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers (Multi-tenant)
CREATE TABLE suppliers (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,  -- MULTI-TENANT KEY!
    name VARCHAR NOT NULL,
    contact_info TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Supplier Price Items (Multi-tenant through supplier)
CREATE TABLE supplier_price_items (
    id UUID PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    code VARCHAR NOT NULL,
    description TEXT,
    unit VARCHAR NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    currency VARCHAR DEFAULT 'GBP',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Templates (Multi-tenant)
CREATE TABLE templates (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,  -- MULTI-TENANT KEY!
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Template Items
CREATE TABLE template_items (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES templates(id) NOT NULL,
    element_type VARCHAR NOT NULL,
    description TEXT,
    unit VARCHAR NOT NULL,
    default_unit_price NUMERIC(12,2),
    default_currency VARCHAR,
    quantity_multiplier NUMERIC(8,3) DEFAULT 1.0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Estimates (Multi-tenant)
CREATE TABLE estimates (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,  -- MULTI-TENANT KEY!
    job_id UUID REFERENCES jobs(id),
    project_id UUID REFERENCES projects(id),
    name VARCHAR NOT NULL,
    description TEXT,
    subtotal NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    currency VARCHAR DEFAULT 'GBP',
    notes TEXT,
    tags VARCHAR[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Estimate Items
CREATE TABLE estimate_items (
    id UUID PRIMARY KEY,
    estimate_id UUID REFERENCES estimates(id) NOT NULL,
    boq_item_id UUID REFERENCES boq_items(id),
    description TEXT NOT NULL,
    element_type VARCHAR,
    unit VARCHAR NOT NULL,
    quantity NUMERIC(12,3) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    currency VARCHAR DEFAULT 'GBP',
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cost Adjustments (for estimates)
CREATE TABLE cost_adjustments (
    id UUID PRIMARY KEY,
    estimate_id UUID REFERENCES estimates(id) NOT NULL,
    name VARCHAR NOT NULL,  -- e.g., "VAT", "Overhead", "Profit"
    adjustment_type VARCHAR NOT NULL,  -- 'percentage' or 'fixed'
    value NUMERIC(12,2) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,  -- Calculated amount
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Artifacts (exports)
CREATE TABLE artifacts (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) NOT NULL,
    kind VARCHAR NOT NULL,  -- boq.csv, boq.xlsx, boq.pdf
    path VARCHAR NOT NULL,
    size BIGINT NOT NULL,
    checksum VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin: Global Price Lists
CREATE TABLE price_lists (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    region VARCHAR DEFAULT 'UK',
    currency VARCHAR DEFAULT 'GBP',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin: Global Price Items
CREATE TABLE price_items (
    id UUID PRIMARY KEY,
    price_list_id UUID REFERENCES price_lists(id) NOT NULL,
    code VARCHAR NOT NULL,
    description TEXT,
    unit VARCHAR NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin: Mapping (IFC/DWG to BOQ categories)
CREATE TABLE mappings (
    id UUID PRIMARY KEY,
    rule_type VARCHAR NOT NULL,  -- 'ifc_class', 'dwg_layer'
    source_value VARCHAR NOT NULL,  -- e.g., 'IfcWall', 'A-WALL'
    target_category VARCHAR NOT NULL,
    target_unit VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Security & Multi-Tenancy

### Multi-Tenant Isolation

**Every resource is linked to user:**
- `projects.owner_id` → `users.id`
- `files.user_id` → `users.id`
- `jobs.user_id` → `users.id`
- `suppliers.user_id` → `users.id`
- `templates.user_id` → `users.id`
- `estimates.user_id` → `users.id`

**Backend enforces isolation:**
```python
# ALWAYS filter by user_id
project = db.query(Project).filter(
    Project.id == project_id,
    Project.owner_id == user.id  # Security check!
).first()
```

**What users CANNOT access:**
- ❌ Other users' projects
- ❌ Other users' files
- ❌ Other users' jobs
- ❌ Other users' BOQ items
- ❌ Other users' suppliers
- ❌ Other users' templates
- ❌ Other users' estimates

### Authentication Flow

1. **Login** → JWT token (24h validity)
2. **Every API request** → `Authorization: Bearer <token>`
3. **Backend validates token** → Extracts `user_id` from JWT
4. **get_current_user()** dependency → Returns User object
5. **All queries filtered** by `user.id`

### Credit System

**Atomic transactions:**
```python
# Credits deducted BEFORE job starts
user.credits_balance -= COST_PER_JOB
db.commit()

try:
    process_job()
except Exception:
    # If job fails → REFUND credits!
    user.credits_balance += COST_PER_JOB
    db.commit()
```

### Rate Limiting

**Nginx level:**
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://localhost:8000;
}
```

**Application level:** Can add per-user rate limiting

---

## API Endpoints Summary

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT
- `POST /api/v1/auth/verify-email` - Verify email with token
- `POST /api/v1/auth/resend-verification` - Resend verification email
- `GET /api/v1/auth/me` - Get current user info

### Projects
- `GET /api/v1/projects` - List user's projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project
- `PATCH /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Files
- `POST /api/v1/files` - Request presigned upload URL
- `PUT /api/v1/files/{id}/content` - Finalize upload
- `GET /api/v1/files/{id}` - Get file info

### Jobs
- `GET /api/v1/jobs` - List user's jobs
- `POST /api/v1/jobs` - Create job (process file)
- `GET /api/v1/jobs/{id}` - Get job details
- `GET /api/v1/jobs/{id}/events` - Get job events
- `GET /api/v1/jobs/{id}/stream` - SSE stream for real-time updates
- `GET /api/v1/jobs/{id}/takeoff` - Get BOQ items
- `POST /api/v1/jobs/{id}/apply-prices` - Apply prices to BOQ
- `GET /api/v1/jobs/{id}/boq` - Get priced BOQ
- `POST /api/v1/jobs/{id}/export` - Export BOQ (CSV/XLSX/PDF)
- `GET /api/v1/jobs/{id}/artifacts` - List job artifacts

### Artifacts
- `POST /api/v1/artifacts/{id}/presign` - Get download URL
- `GET /api/v1/artifacts/{id}/download` - Download artifact

### Suppliers
- `GET /api/v1/suppliers` - List user's suppliers
- `POST /api/v1/suppliers` - Create supplier
- `GET /api/v1/suppliers/{id}` - Get supplier
- `PATCH /api/v1/suppliers/{id}` - Update supplier
- `DELETE /api/v1/suppliers/{id}` - Delete supplier
- `GET /api/v1/suppliers/{id}/items` - List supplier price items
- `POST /api/v1/suppliers/{id}/items` - Add price item
- `PATCH /api/v1/suppliers/{id}/items/{item_id}` - Update price item
- `DELETE /api/v1/suppliers/{id}/items/{item_id}` - Delete price item
- `POST /api/v1/suppliers/{id}/items/import` - Bulk import from CSV

### Templates
- `GET /api/v1/templates` - List user's templates
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates/{id}` - Get template
- `PATCH /api/v1/templates/{id}` - Update template
- `DELETE /api/v1/templates/{id}` - Delete template
- `POST /api/v1/templates/{id}/clone` - Clone template
- `GET /api/v1/templates/{id}/items` - List template items
- `POST /api/v1/templates/{id}/items` - Add template item
- `PATCH /api/v1/templates/{id}/items/{item_id}` - Update item
- `DELETE /api/v1/templates/{id}/items/{item_id}` - Delete item
- `POST /api/v1/templates/apply` - Apply template to job

### Estimates
- `GET /api/v1/estimates` - List user's estimates
- `POST /api/v1/estimates` - Create estimate
- `GET /api/v1/estimates/{id}` - Get estimate
- `PATCH /api/v1/estimates/{id}` - Update estimate
- `DELETE /api/v1/estimates/{id}` - Delete estimate
- `POST /api/v1/estimates/{id}/clone` - Clone estimate
- `GET /api/v1/estimates/{id}/items` - List estimate items
- `POST /api/v1/estimates/{id}/items` - Add estimate item
- `PATCH /api/v1/estimates/{id}/items/{item_id}` - Update item
- `DELETE /api/v1/estimates/{id}/items/{item_id}` - Delete item
- `GET /api/v1/estimates/{id}/adjustments` - List cost adjustments
- `POST /api/v1/estimates/{id}/adjustments` - Add adjustment
- `PATCH /api/v1/estimates/{id}/adjustments/{adj_id}` - Update adjustment
- `DELETE /api/v1/estimates/{id}/adjustments/{adj_id}` - Delete adjustment

### Admin (requires admin role)
- `GET /api/v1/admin/price-lists` - List price lists
- `GET /api/v1/admin/price-lists/active` - Get active price list
- `POST /api/v1/admin/price-lists` - Create price list
- `PATCH /api/v1/admin/price-lists/{id}` - Update price list
- `POST /api/v1/admin/price-lists/{id}/items:bulk` - Bulk import items
- `GET /api/v1/admin/mapping/dwg-layers` - Get DWG mapping
- `PUT /api/v1/admin/mapping/dwg-layers` - Update DWG mapping
- `GET /api/v1/admin/mapping/ifc-classes` - Get IFC mapping
- `PUT /api/v1/admin/mapping/ifc-classes` - Update IFC mapping
- `GET /api/v1/admin/access-requests` - List access requests
- `PATCH /api/v1/admin/access-requests/{id}` - Approve/reject

---

## Performance & Optimization

### Frontend
- **Code splitting:** Dynamic imports for routes
- **Lazy loading:** Images and heavy components
- **Caching:** Browser caches static assets (1 year)
- **Minification:** Vite production build

### Backend
- **Database indexes:** On all foreign keys and filter columns
- **Connection pooling:** SQLAlchemy pool
- **Query optimization:** Eager loading with `joinedload()`
- **Pagination:** Limit result sets

### File Processing
- **Async processing:** Jobs run in background
- **Progress updates:** Real-time via SSE
- **Error handling:** Automatic credit refunds

---

**END OF TRACE**

This document provides a complete trace of all user flows through the SkyBuild Pro system, from frontend to backend to database.


