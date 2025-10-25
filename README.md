# SkyBuild Pro

**Full-Stack SaaS Construction Cost Estimation Platform**

SkyBuild Pro is a modern web application for construction cost estimation, BOQ generation, and project management. Built with React + TypeScript frontend and FastAPI Python backend.

## Features

### Core Features
- **User Authentication**: Email/password registration with email verification
- **File Processing**: IFC, DWG, and PDF file uploads with automated BOQ extraction
- **Templates System**: Reusable cost estimation templates with items and pricing
- **Estimates Management**: Create detailed estimates with items, adjustments, and calculations
- **Supplier Integration**: Manage suppliers and apply pricing from supplier catalogs
- **Export Functionality**: Export BOQ data to CSV, XLSX, and PDF formats
- **Billing System**: Credits-based billing with user upgrades

### Security & Quality
- **Rate Limiting**: IP-based rate limiting (100 req/min) to prevent abuse
- **Input Validation**: Comprehensive validation for all user inputs
- **Error Handling**: Standardized error responses across all endpoints
- **Authentication**: JWT-based authentication with secure password hashing
- **Test Coverage**: 78 backend tests covering all major endpoints

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Query for server state
- **Routing**: React Router v6
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python 3.13)
- **ORM**: SQLAlchemy 2.0
- **Database**: SQLite (dev) / PostgreSQL (production ready)
- **Authentication**: JWT with bcrypt password hashing
- **Testing**: Pytest with in-memory SQLite
- **Email**: SendGrid integration

## Project Structure

```
skybuild_o1/
├── apps/
│   └── user-frontend/          # React frontend application
│       ├── src/
│       │   ├── components/     # Reusable UI components
│       │   ├── pages/          # Page components
│       │   ├── services/       # API client (api.ts)
│       │   ├── hooks/          # Custom React hooks
│       │   └── main.tsx        # Application entry point
│       ├── package.json
│       └── vite.config.ts
│
├── backend/                    # FastAPI backend application
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/      # API route handlers
│   │   │   └── router.py       # Main API router
│   │   ├── core/               # Core utilities (security, config, validation)
│   │   ├── db/                 # Database configuration
│   │   ├── middleware/         # Rate limiting, error handling
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic services
│   │   └── main.py             # Application entry point
│   ├── tests/                  # Pytest test suite
│   ├── storage/                # File storage directory
│   ├── requirements.txt
│   └── README.md
│
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.11+
- **Git**

### 1. Clone Repository

```bash
git clone <repository-url>
cd skybuild_o1
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (REQUIRED!)
python migrate_add_registration.py
python migrate_add_templates_estimates.py

# Set environment variables (or create .env file)
export SECRET_KEY="your-super-secret-key-min-32-chars"
export SENDGRID_API_KEY="your-sendgrid-api-key"
export FROM_EMAIL="noreply@yourdomain.com"
export STORAGE_DIR="./storage"

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd apps/user-frontend

# Install dependencies
npm install

# Set environment variables (or create .env file)
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Environment Configuration

### Backend Environment Variables

Create `backend/.env`:

```bash
# Required
SECRET_KEY=your-super-secret-key-minimum-32-characters
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# Storage
STORAGE_DIR=./storage

# CORS Origins
USER_APP_ORIGIN=http://localhost:5173
ADMIN_APP_ORIGIN=http://localhost:5174

# Database (optional - defaults to SQLite)
# DB_URL=postgresql://user:password@localhost/skybuild

# Email Verification URL (optional)
# VERIFY_EMAIL_URL=http://localhost:5173/verify-email
```

### Frontend Environment Variables

Create `apps/user-frontend/.env`:

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

## Testing

### Backend Tests

```bash
cd backend
source venv/bin/activate

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_templates.py -v
```

Test coverage: **78 tests** across 4 test modules:
- Templates (19 tests)
- Estimates (25 tests)
- Billing (12 tests)
- Projects (22 tests)

### Frontend Tests

```bash
cd apps/user-frontend
npm run test
```

## API Documentation

Once the backend is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## Key API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `POST /api/v1/auth/verify-email` - Verify email address
- `GET /api/v1/auth/me` - Get current user info

### Templates
- `GET /api/v1/templates` - List templates
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates/{id}` - Get template details
- `POST /api/v1/templates/{id}/clone` - Clone template
- `POST /api/v1/templates/apply` - Apply template to job

### Estimates
- `GET /api/v1/estimates` - List estimates
- `POST /api/v1/estimates` - Create estimate
- `GET /api/v1/estimates/{id}` - Get estimate details
- `POST /api/v1/estimates/{id}/clone` - Clone estimate
- `GET /api/v1/estimates/{id}/items` - Get estimate items
- `GET /api/v1/estimates/{id}/adjustments` - Get cost adjustments

### Jobs & Export
- `POST /api/v1/jobs` - Create new job
- `GET /api/v1/jobs/{id}/takeoff` - Get BOQ items
- `POST /api/v1/jobs/{id}/apply-prices` - Apply supplier pricing
- `POST /api/v1/jobs/{id}/export?format=csv|xlsx|pdf` - Export BOQ

### Billing
- `GET /api/v1/billing/balance` - Get user balance
- `POST /api/v1/billing/upgrade` - Request account upgrade

## Development

### Running Tests During Development

```bash
# Backend - watch mode
cd backend
ptw  # pytest-watch

# Frontend - watch mode
cd apps/user-frontend
npm run test:watch
```

### Code Style

Backend follows PEP 8 with:
- Line length: 120 characters
- Type hints encouraged
- Docstrings for all public functions

Frontend follows:
- ESLint + Prettier
- TypeScript strict mode
- Functional components with hooks

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions including:
- Docker deployment
- PostgreSQL configuration
- Nginx reverse proxy
- SSL/TLS setup
- Environment security

## Common Issues

### Backend won't start

1. Check SECRET_KEY is set: `echo $SECRET_KEY`
2. Verify database migrations ran: `ls backend/skybuild.db`
3. Check Python version: `python --version` (should be 3.11+)

### Frontend can't connect to backend

1. Verify VITE_API_URL in `.env`: `cat apps/user-frontend/.env`
2. Check backend is running: `curl http://localhost:8000/healthz`
3. Check CORS settings in `backend/app/core/config.py`

### Email verification not working

1. Check SENDGRID_API_KEY is set
2. Verify FROM_EMAIL is authorized in SendGrid
3. Check email logs in SendGrid dashboard

### Tests failing

1. Ensure test database is clean: `rm backend/test.db`
2. Check all dependencies installed: `pip install -r requirements.txt`
3. Run with verbose output: `pytest -vv`

## Project Status

**Current Version**: 1.0.0
**Status**: Production Ready (96% complete)

### Completed Features
- ✅ User registration with email verification
- ✅ JWT authentication
- ✅ Templates system (CRUD, clone, apply)
- ✅ Estimates system (CRUD, clone, items, adjustments)
- ✅ Billing and credits system
- ✅ File upload and BOQ extraction
- ✅ Export to CSV/XLSX/PDF
- ✅ Supplier management
- ✅ Rate limiting and security
- ✅ Comprehensive test suite (78 tests)
- ✅ Error handling and validation
- ✅ Onboarding wizard

### Optional Enhancements
- Mobile responsive optimization
- Redis caching for performance
- Frontend test coverage with React Testing Library
- Internationalization (i18n)

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit pull request

## License

Proprietary - All rights reserved

## Support

For issues or questions:
- Check [API Documentation](http://localhost:8000/api/v1/docs)
- Review [Common Issues](#common-issues)
- Contact: support@skybuild.pro
