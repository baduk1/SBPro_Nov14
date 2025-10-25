# SkyBuild Pro — Backend (FastAPI)

Full-featured backend with:
- User registration & email verification
- Suppliers management
- Templates & Estimates
- IFC/DWG/PDF file processing
- BoQ generation and pricing
- Export to CSV/XLSX/PDF with SSE status updates

## Requirements

- Python 3.11+
- SQLite (bundled) or Postgres (set `DB_URL`)
- See `requirements.txt`

## First Time Setup

### 1. Install dependencies

```bash
python -m venv env  # or .venv
source env/bin/activate  # or source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run database migrations (REQUIRED!)

```bash
# Migration 1: Add registration support
python migrate_add_registration.py

# Migration 2: Add templates & estimates
python migrate_add_templates_estimates.py
```

### 3. Start server

```bash
export STORAGE_DIR=./storage
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
