# SkyBuild Pro — Take‑off Engine v0

**Purpose**: minimal, production‑friendly skeleton for *electrical + water* take‑off from **IFC** and **DWG/DXF**,
with mapping-driven interpretation and BoQ export (CSV, XLSX). Designed to plug into your FastAPI worker.

> Works today with open libraries; preserves seams to later swap in ODA/Forge or a custom parser.

## Features (v0)
- IFC extraction via **IfcOpenShell** (entities: Pipe/Cable segments, sanitary terminals, light fixtures, outlets, switches, boards).
- DWG by converting to **DXF** (via ODA File Converter) and parsing with **ezdxf** (layers/blocks → lengths & counts).
- Admin-configurable **mapping** (YAML) to interpret layer names / IFC types into BoQ items.
- Unit normalization (meters / items). 
- BoQ builder with grouping and simple price-list join by `code`.
- Export **CSV** (always) and **XLSX** (if `openpyxl` installed).

## Quick start

```bash
# 1) Python env (3.10+ recommended)
pip install -r requirements.txt

# 2) Run CLI
python -m engine.cli takeoff /path/to/model.ifc --mapping config/mapping.example.yml --out out/boq.csv
python -m engine.cli takeoff /path/to/drawing.dwg --mapping config/mapping.example.yml --out out/boq.csv

# (Optional) with price list join
python -m engine.cli takeoff /path/to/model.ifc --mapping config/mapping.example.yml --price config/prices.example.csv --out out/boq_priced.csv
```

> For DWG: install **ODA File Converter** (free). Ensure it's on PATH (command `ODAFileConverter` or `odafc`).  
> On Linux servers you can run it headless. The CLI wrapper detects common names.

## Integrating into your FastAPI worker

Use `engine.api.run_takeoff(path, mapping_path, price_path)` from your job processor; it returns a `pandas.DataFrame`.
```python
from engine.api import run_takeoff
df = run_takeoff(upload_path, "config/mapping.example.yml", price_path=None)
# save CSV/XLSX or push into your BoQ endpoint
```

## Notes
- IfcOpenShell geometry is optional; v0 prefers `IfcElementQuantity` length/count when present, otherwise falls back to simple geometry heuristics.
- DXF approach assumes your DWGs follow layer/block conventions. Refine `config/mapping.example.yml` per client.
- XLSX export requires `openpyxl` installed.
- Keep this module **stateless**; all state belongs to your app (projects/jobs/artifacts).

## Roadmap hooks
- Swap DXF path with **ODA SDK** / **Autodesk Forge** microservice for 100% coverage.
- Add **unit inference** from DXF header `$INSUNITS` and drawing scale (implemented baseline).
- Extend IFC coverage to **valves, fittings, distribution boards** with properties (diameter, material).
- Add **AI assist** (`engine.assist.ai_map`) to guess category for unknown layers (OpenAI API optional).
