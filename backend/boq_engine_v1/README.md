# SkyBuild Pro — Take‑off Engine v1

**Goal:** Turn *construction drawings/models* (DWG/DXF/IFC) into **auditable quantities** and a **Bill of Quantities (BoQ)** with *validation gates*, **mapping-driven interpretation**, and **price joining**.

**What’s new vs v0**
- **Validation gates** before extraction (format, readability, unit inference, content sanity, mapping coverage).
- **Pattern‑based mapping** (wildcards/regex) for DXF layers and block names; case‑insensitive.
- **IFC improvements**: uses `IfcElementQuantity` when available; falls back to port geometry; supports **SanitaryTerminal, Pipe/Cable Segment, Outlet, Switch, Light, Boards, Valves, Fittings** (counts).
- **DXF improvements**: length for LINE/LWPOLYLINE/POLYLINE/ARC/CIRCLE/**SPLINE**; unit scaling from `$INSUNITS`; optional **AI fallback** to guess category for unknown layers/blocks.
- **BoQ builder**: grouping; optional **price join** with line totals; columns kept deterministic.
- **CLI**: `validate` and `takeoff` subcommands. Exports **CSV/XLSX**.
- **Seams** for ODA/Forge or your future custom parser.

## Quick start

```bash
pip install -r requirements.txt

# Validate first
python -m engine.cli validate path/to/model.ifc --mapping config/mapping.example.yml

# Take-off (IFC)
python -m engine.cli takeoff path/to/model.ifc --mapping config/mapping.example.yml --out out/boq.csv

# Take-off (DWG/DXF) — DWG auto-converted via ODA File Converter if available
python -m engine.cli takeoff path/to/drawing.dwg --mapping config/mapping.example.yml --out out/boq.csv

# Add prices
python -m engine.cli takeoff path/to/model.ifc --mapping config/mapping.example.yml --price config/prices.example.csv --out out/boq_priced.xlsx
```

## Output schema

| column        | meaning                                                |
| ------------- | ------------------------------------------------------ |
| `code`        | BoQ item code (from mapping or inferred)               |
| `description` | Human label (type/material/diameter when available)    |
| `unit`        | `m` for linear, `item` for count                       |
| `qty`         | numeric quantity (meters or count)                     |
| `source`      | `IFC:#id` or `DXF:layer:type` / `DXF:BLK:name`         |
| `rate`        | (if priced) unit rate                                  |
| `currency`    | (if priced) currency code                              |
| `line_total`  | (if priced) qty × rate                                 |

## Notes
- DXF path uses **ezdxf**; DWG is converted to DXF via **ODA File Converter** if present.
- IFC path uses **IfcOpenShell**; quantities prefer standardized QTO sets where available.
- Pattern mapping lets you start simple and adapt per‑client standards quickly.
- This package is **stateless**; persist artifacts in your app (jobs table + S3/bucket).
