from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Dict

import pandas as pd

from app.services.storage import mapping_file_path as resolve_mapping_path

logger = logging.getLogger(__name__)


def _load_engine():
    try:
        from boq_engine_v1.engine.api import run_takeoff as engine_run_takeoff  # type: ignore
        return engine_run_takeoff
    except Exception as e:  # pragma: no cover
        raise RuntimeError(
            "BOQ engine (boq_engine_v1) is not available. Check dependencies and imports."
        ) from e


def _round_qty(unit: str, q: float) -> float:
    u = (unit or "").strip().lower()
    if u in {"pcs", "pc", "шт", "ea", "each", "item", "piece", "pieces", "count"}:
        return float(int(round(q)))
    if u in {"m3", "cubic m", "cubic meter", "cu m", "м3"}:
        return round(float(q), 3)
    if u in {"m2", "sqm", "sq m", "м2"}:
        return round(float(q), 2)
    if u in {"m", "meter", "metre", "ft", "mm", "cm", "метр"}:
        return round(float(q), 2)
    return round(float(q), 2)


def _normalize_row(row: Dict) -> Dict:
    code = str(row.get("code")) if (row.get("code") not in (None, "", "None")) else None
    desc = str(row.get("description") or row.get("element_type") or "Item")
    unit = str(row.get("unit") or "item")
    qty = float(row.get("qty") or 0.0)
    qty = _round_qty(unit, qty)
    src = row.get("source") or row.get("source_ref") or None
    return {
        "code": code,
        "description": desc,
        "unit": unit,
        "qty": qty,
        "source_ref": src,
    }


def run_ifc_takeoff(
    file_path: str,
    mapping_path: str | None = None,
    price_path: str | None = None,
) -> List[Dict]:
    engine = _load_engine()

    mp = Path(mapping_path) if mapping_path else Path(resolve_mapping_path())
    if not mp.exists():
        raise RuntimeError(f"Mapping file not found: {mp}")

    try:
        if price_path is not None:
            df: pd.DataFrame = engine(Path(file_path), mp, Path(price_path))
        else:
            df: pd.DataFrame = engine(Path(file_path), mp, price_path=None)  # type: ignore
    except Exception as e:
        logger.exception("BOQ engine error: %s", e)
        raise RuntimeError(
            "Failed to run IFC take-off. Ensure IFC is valid and mapping.yml is correct."
        ) from e

    if not isinstance(df, pd.DataFrame):
        raise RuntimeError("Unexpected engine output (expected pandas.DataFrame).")

    records = [_normalize_row(r) for r in df.to_dict(orient="records")]
    for r in records:
        for k in ("code", "description", "unit", "qty", "source_ref"):
            if k not in r:
                r[k] = None if k in {"code", "source_ref"} else (0.0 if k == "qty" else "")
    return records
