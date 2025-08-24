# Blueprint Estimator Hub — Backend (FastAPI)

MVP backend implementing upload → job pipeline → take‑off (mocked) → price application → BoQ exports (CSV/XLSX/PDF) with SSE status updates.

## Requirements

- Python 3.11
- SQLite (bundled) or Postgres (set `DB_URL`)
- See `requirements.txt`

## Quickstart (dev)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export STORAGE_DIR=./storage
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
