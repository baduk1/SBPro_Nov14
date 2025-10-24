# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkyBuild Pro is a full-stack SaaS platform for construction cost estimation and Bill of Quantities (BOQ) generation. The system processes IFC, DWG, and PDF files to extract construction quantities and generate detailed cost estimates.

**Tech Stack:**
- **Frontend**: React 18 + TypeScript + Vite + Material-UI v5
- **Backend**: FastAPI (Python 3.13) + SQLAlchemy 2.0 + SQLite/PostgreSQL
- **Authentication**: JWT with bcrypt password hashing
- **Testing**: Pytest with 78 backend tests

## Repository Structure

```
skybuild_o1/
├── apps/
│   ├── user-frontend/          # Main user application (port 5173)
│   └── admin-frontend/         # Admin panel (port 5174)
├── backend/                    # FastAPI backend (port 8000)
│   ├── app/
│   │   ├── api/v1/endpoints/   # API route handlers
│   │   ├── core/               # Security, config, validation
│   │   ├── db/                 # Database configuration
│   │   ├── middleware/         # Rate limiting, error handling
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # Business logic services
│   ├── boq_engine_v1/          # BOQ extraction engine (IFC/DWG/DXF)
│   ├── tests/                  # Pytest test suite
│   └── storage/                # File storage directory
└── README.md
```

## Development Commands

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (REQUIRED for first setup!)
python migrate_add_registration.py
python migrate_add_templates_estimates.py

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run all tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_templates.py -v

# Run specific test
pytest tests/test_templates.py::test_create_template -v
```

### Frontend (User App)

```bash
cd apps/user-frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

### Frontend (Admin App)

```bash
cd apps/admin-frontend

# Install dependencies
npm install

# Start development server (runs on port 5174)
npm run dev

# Build for production
npm run build
```

## Environment Setup

### Backend `.env` (Required)

Create `backend/.env`:

```bash
# Required - must be 32+ characters
SECRET_KEY=your-super-secret-key-minimum-32-characters

# SendGrid email (for email verification)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# Storage
STORAGE_DIR=./storage

# CORS Origins
USER_APP_ORIGIN=http://localhost:5173
ADMIN_APP_ORIGIN=http://localhost:5174

# Optional - defaults to SQLite
# DB_URL=postgresql://user:password@localhost/skybuild
```

### Frontend `.env`

Create `apps/user-frontend/.env`:

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

## Architecture

### Backend Architecture

**API Structure**: The API follows RESTful conventions with versioned endpoints (`/api/v1/`). All endpoints are organized by resource type in `app/api/v1/endpoints/`.

**Key API Modules**:
- `auth.py` - User registration, login, email verification
- `templates.py` - Reusable cost estimation templates
- `estimates.py` - Detailed estimates with items and adjustments
- `projects.py` - Project management
- `jobs.py` - File processing jobs (IFC/DWG/PDF)
- `suppliers.py` - Supplier management and pricing catalogs
- `billing.py` - Credits-based billing system
- `admin_*.py` - Admin endpoints for price lists, mappings, access requests

**Database Models**: SQLAlchemy models in `app/models/` define the schema. Key models:
- `User` - Authentication with role-based access (user/admin)
- `Project` - User projects
- `Template` / `TemplateItem` - Reusable cost templates
- `Estimate` / `EstimateItem` / `CostAdjustment` - Detailed estimates
- `Job` - File processing jobs
- `Supplier` / `SupplierPriceItem` - Supplier pricing
- `EmailVerificationToken` - Email verification tokens

**Security**:
- JWT tokens with bcrypt password hashing
- Rate limiting: 100 requests/minute per IP (configurable in `app/middleware/rate_limit.py`)
- Input validation via Pydantic schemas
- Standardized error handling via `app/middleware/error_handler.py`
- Admin endpoints require `role='admin'` in JWT

**BOQ Engine**: The `boq_engine_v1/` package handles construction file processing:
- **IFC files**: Uses `ifcopenshell` to extract quantities from IFC models
- **DWG/DXF files**: Uses `ezdxf` for DXF parsing, auto-converts DWG via ODA File Converter
- **Validation gates**: Format checks, unit inference, mapping coverage validation
- **Mapping-driven**: Uses YAML config files to map layers/classes to BOQ element types
- **Output**: Generates structured BOQ with code, description, unit, quantity, source

### Frontend Architecture

**Routing**: React Router v6 with protected routes. Auth check via `useAuth` hook redirects unauthenticated users to login.

**API Client**: Centralized in `src/services/api.ts` with organized namespaces:
- `auth.*` - Authentication endpoints
- `templates.*` - Template CRUD operations
- `estimates.*` - Estimate CRUD operations
- `jobs.*` - Job processing
- `files.*` - File upload with presigned URLs

**State Management**:
- Server state: React Query (`@tanstack/react-query`)
- Auth state: Context + localStorage for JWT token
- Component state: React hooks (useState, useEffect)

**Key Pages**:
- `Dashboard.tsx` - Main dashboard with project overview
- `Templates/TemplatesListNew.tsx` - Template management
- `Estimates/EstimatesListNew.tsx` - Estimate management
- `Onboarding.tsx` - 3-step onboarding wizard for new users
- `Suppliers/` - Supplier and pricing management

## Common Workflows

### Adding a New Backend Endpoint

1. Create Pydantic schema in `app/schemas/`
2. Add endpoint function to appropriate file in `app/api/v1/endpoints/`
3. Register router in `app/api/v1/router.py` if new module
4. Add tests in `backend/tests/`
5. Run tests: `pytest`

### Adding a New Database Model

1. Create model in `app/models/`
2. Import in `app/db/base.py` for Alembic visibility
3. Create migration script (e.g., `migrate_add_*.py`)
4. Run migration: `python migrate_add_*.py`
5. Add corresponding Pydantic schemas in `app/schemas/`

### File Upload Flow

The system uses presigned URLs for secure file uploads:

1. Frontend requests presigned URL: `POST /api/v1/files/presign`
2. Backend generates presigned URL with HMAC signature
3. Frontend uploads file directly to storage using presigned URL
4. Frontend creates job: `POST /api/v1/jobs`
5. Backend processes file asynchronously, updates job status
6. Frontend polls job status: `GET /api/v1/jobs/{id}`

### Processing Pipeline

1. **File Upload**: User uploads IFC/DWG/PDF file
2. **Job Creation**: System creates processing job with status `PENDING`
3. **BOQ Extraction**: `boq_engine_v1` processes file, extracts quantities
4. **Storage**: BOQ items stored in database linked to job
5. **Pricing**: Apply supplier pricing or template pricing to items
6. **Export**: Generate CSV/XLSX/PDF reports via `app/services/exports.py`

## Database Migrations

Database migrations are currently handled via standalone Python scripts (not Alembic yet):

- `migrate_add_registration.py` - Adds user registration and email verification tables
- `migrate_add_templates_estimates.py` - Adds templates and estimates tables

**Running migrations**:
```bash
cd backend
python migrate_add_registration.py
python migrate_add_templates_estimates.py
```

Migrations are idempotent and safe to run multiple times.

## Testing

### Backend Tests

Test files in `backend/tests/`:
- `test_templates.py` - 19 tests for template CRUD and cloning
- `test_estimates.py` - 25 tests for estimate operations
- `test_billing.py` - 12 tests for billing and credits
- `test_projects.py` - 22 tests for project management

Tests use in-memory SQLite (`test.db`) with fixtures in `conftest.py`:
- `client` - TestClient with clean database per test
- `test_user` - Authenticated test user with JWT token

**Running tests**:
```bash
# All tests
pytest

# Specific module
pytest tests/test_templates.py -v

# Specific test
pytest tests/test_templates.py::test_create_template -v

# With coverage
pytest --cov=app --cov-report=html
```

## API Documentation

Interactive API docs available when backend is running:
- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## Important Notes

### Security Requirements

- **SECRET_KEY**: Must be set in environment (32+ characters). Backend fails fast if not set.
- **Rate Limiting**: Applied via middleware, configurable per route
- **Admin Endpoints**: All `/admin/*` endpoints require `role='admin'` JWT claim
- **Email Verification**: Required for new users before full access

### File Storage

Files are stored locally in `backend/storage/` (configurable via `STORAGE_DIR`). Directory structure:
```
storage/
├── uploads/           # User uploaded files
├── artifacts/         # Generated BOQ/reports
└── config/           # Mapping files for BOQ engine
```

### BOQ Engine Integration

The BOQ engine (`boq_engine_v1/`) is integrated via `app/services/takeoff/`:
- `ifc_adapter.py` - IFC file processing
- `dxf_adapter.py` - DXF/DWG file processing
- `pdf_adapter.py` - PDF plan processing (OCR + detection)

Mapping configuration in `storage/config/mapping.yml` defines how layers/classes map to BOQ element types.

### Known Limitations

- **File Processing**: Currently synchronous; large files may timeout. Consider background tasks for production.
- **Admin User Creation**: No UI for creating first admin; must be done via Python shell (see `apps/admin-frontend/README.md`).
- **Database**: Uses SQLite by default; PostgreSQL recommended for production (set `DB_URL` env var).

## Troubleshooting

### Backend won't start
- Check `SECRET_KEY` is set: `echo $SECRET_KEY`
- Verify migrations ran: `ls backend/skybuild.db`
- Check Python version: `python --version` (requires 3.11+)

### Frontend can't connect to backend
- Verify `VITE_API_URL` in `.env`
- Check backend is running: `curl http://localhost:8000/healthz`
- Check CORS settings in `backend/app/core/config.py`

### Tests failing
- Clean test database: `rm backend/test.db`
- Reinstall dependencies: `pip install -r requirements.txt`
- Run with verbose output: `pytest -vv`

### Email verification not working
- Check `SENDGRID_API_KEY` is set
- Verify `FROM_EMAIL` is authorized in SendGrid dashboard
- Check SendGrid logs for delivery status
