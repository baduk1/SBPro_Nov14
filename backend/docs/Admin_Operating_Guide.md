# SkyBuild Pro — Admin Operating Guide (Test/Demo)

This guide explains how to configure mappings & price lists and run an end‑to‑end demo using the existing backend and the admin/user front‑ends.

---

## 1) Prerequisites

- Backend running (FastAPI): `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Environment:
  - `SECRET_KEY` must be set (non-empty) — the backend will refuse to start otherwise.
  - Optional: `USER_APP_ORIGIN` and `ADMIN_APP_ORIGIN` for CORS.
- Python deps: see `backend/requirements.txt` (includes `ifcopenshell`, `ezdxf`, `pandas`, etc.).

**Create the first admin** (one‑time, run from backend directory):

```bash
cd backend
python create_admin_user.py
# Enter admin email and password securely (using getpass)
```

Use these credentials in the **admin-frontend** to sign in.

> **SECURITY NOTE**: Never use default credentials like "admin123" in production.
> The `create_admin_user.py` script ensures secure password input without logging.

---

## 2) IFC Mapping (YAML)

**Where used:** The IFC take‑off engine reads a YAML file on disk.
- Default location: `storage/config/mapping.yml`
- Or set env: `MAPPING_FILE=/absolute/path/to/mapping.yml`

> Note: The current admin UI stores **DWG layer** rules in the DB. IFC class mapping is **file-based** and not edited from the UI yet.

**Action:** place the provided `mapping.yml` into `storage/config/mapping.yml` on the server.

---

## 3) Price Lists

Create or import price lists via admin endpoints (the admin UI calls these):

- **Create a list**
  - `POST /api/v1/admin/price-lists` with JSON:
    ```json
    { "version": "2025-10 test", "currency": "GBP", "effective_from": "2025-10-01", "is_active": true }
    ```

- **Bulk import items**
  - `POST /api/v1/admin/price-lists/{price_list_id}/items:bulk` (multipart/form-data) with a CSV that has columns:
    `code,description,unit,rate`
  - Use the provided `price_list.csv`. Codes align with `mapping.yml`.

- **Active price list**
  - The system picks the **active** price list automatically if `price_list_id` is not supplied when creating a Job.
  - You can switch active lists by `PATCH /api/v1/admin/price-lists/{id}` (set `is_active=true` and optionally update dates).

**How codes are used:** During `/jobs/{id}/apply-prices`, each BoQ item with a non‑empty `code` is matched to `PriceItem.code`. Unmatched items keep `rate=0` and `amount` shows only any `allowance_amount` you set later.

---

## 4) DWG/DXF Layer Mapping

**Where used:** The DWG/DXF take‑off reads layer rules from the DB (table `dwg_layer_map`) via the Admin APIs.

- **PUT** `/api/v1/admin/mappings/dwg-layers` with JSON body = list of entries:
  ```json
  [
    {"layer_name": "PL_PIPE*", "element_type": "Pipe Run", "default_unit": "m", "default_code": "P10/100"},
    {"layer_name": "ELEC-LIGHTING*", "element_type": "Cable Run", "default_unit": "m", "default_code": "P40/100"}
  ]
  ```

- Wildcards are supported (e.g., `PLUMBING-*`). The take‑off uses `fnmatch` to match patterns.

- Block mappings: engine supports block counts, but the current DB model exposes **layers only**. For now, prefer layer‑based rules in demo.

Use the provided files:
- `dwg_mapping.json` — ready for the PUT request body.
- `dwg_layers.csv` — a spreadsheet view of the same data for review.

---

## 5) End‑User Workflow (what users see)

1. **Sign in** to the **user-frontend** (admin credentials work for demo).
2. **Create a Project.**
3. **Upload a file** (IFC, DWG/DXF, or supported PDF):
   - The UI calls `/files` to get a **presigned** upload URL and PUTs the bytes.
4. **Create a Job** for the uploaded file:
   - The backend validates and runs take‑off in the background. The UI shows live status via **SSE**.
5. **Review Take‑off**:
   - A table of items appears (Type/Description/Unit/Qty/Source). This is the *raw quantities* stage.
6. **Apply Prices**:
   - Click “Apply Prices” (or call `POST /jobs/{id}/apply-prices`). The backend maps item `code` → `PriceItem` and stores the linkage.
7. **Export**:
   - Generate CSV/XLSX/PDF via `POST /jobs/{id}/export?format=xlsx` (also available in UI under Exports/Downloads).

> If you only see raw items without totals or rates, it typically means **no active price list** or **mapping codes don’t match price list codes**.

---

## 6) Demo Checklist (Happy Path)

- [ ] Copy `mapping.yml` to `storage/config/mapping.yml` on the server.
- [ ] Create a **Price List** and bulk import `price_list.csv`. Set `is_active=true`.
- [ ] PUT `dwg_mapping.json` to `/api/v1/admin/mappings/dwg-layers`.
- [ ] Upload `Ifc4_SampleHouse.ifc` or the Duplex samples.
- [ ] Create a Job; wait for status **completed**.
- [ ] Click **Apply Prices**; verify items now show mapped `rate` in exports.
- [ ] Export **XLSX/PDF** and open the artifact.

---

## 7) Troubleshooting

- **“Validation failed”** at job start → check IFC schema (IFC2x3/IFC4), ensure file not empty, and that units are set (see validator).
- **No items produced** → mapping may be too strict, or the model contains unsupported classes.
- **All rates = 0** → price list inactive, or codes don’t match between mapping and price list.
- **DWG lengths look tiny/huge** → drawing units missing; set units in CAD or pass an override (feature planned), or ensure `$INSUNITS` is set.
- **PDF plan extraction missing** → enable `ENABLE_PDF_PLAN_ENGINE=true` and ensure `pytesseract` / OCR langs installed.

---

## 8) API Quick Reference

- Auth: `POST /api/v1/auth/login` (OAuth2PasswordRequestForm)
- Price Lists: `GET/POST /api/v1/admin/price-lists`, `POST /api/v1/admin/price-lists/{id}/items:bulk`, `PATCH /api/v1/admin/price-lists/{id}`
- Mappings: `GET/PUT /api/v1/admin/mappings/dwg-layers`, `GET/PUT /api/v1/admin/mappings/ifc-classes` (for future use)
- Files: `POST /api/v1/files` → presigned PUT, `PUT /api/v1/files/{id}/content`
- Jobs: `POST /api/v1/jobs`, `GET /api/v1/jobs/{id}`, `GET /api/v1/jobs/{id}/stream`
- Take‑off: `GET /api/v1/jobs/{id}/takeoff`, `POST /api/v1/jobs/{id}/apply-prices`, `POST /api/v1/jobs/{id}/export?format=xlsx|csv|pdf`

---

**That’s it.** With these assets in place, you can run a production‑like demo that exercises the full pipeline from upload → take‑off → pricing → export.
