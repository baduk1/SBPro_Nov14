from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional

import logging

import pandas as pd

logger = logging.getLogger(__name__)

# Architectural + MEP so mechanical/electrical models produce rows too.
SUPPORTED_CLASSES = [
    # Architectural
    "IfcWall", "IfcWallStandardCase", "IfcSlab", "IfcColumn", "IfcBeam",
    "IfcDoor", "IfcWindow", "IfcCovering", "IfcSpace", "IfcStair",
    # MEP segments & fittings
    "IfcPipeSegment", "IfcDuctSegment", "IfcCableSegment",
    "IfcPipeFitting", "IfcDuctFitting", "IfcValve",
    "IfcFlowController", "IfcFlowFitting",
    # MEP fixtures/devices
    "IfcSanitaryTerminal", "IfcLightFixture", "IfcOutlet",
    "IfcSwitchingDevice", "IfcElectricDistributionBoard",
    "IfcDistributionFlowElement",
]


def run_takeoff(ifc_path: Path, mapping_path: Path, price_path: Optional[Path] = None) -> pd.DataFrame:
    """
    Execute IFC take-off and return aggregated BoQ rows as a DataFrame.

    Columns: element_type, description, unit, qty, code, source
    """
    try:
        import ifcopenshell  # type: ignore
    except Exception as e:  # pragma: no cover - import error message must be clear for ops
        raise RuntimeError(
            "Python package 'ifcopenshell' is required to parse IFC files. "
            "Install it with: pip install ifcopenshell"
        ) from e

    from .ingest.ifc_reader import (
        open_ifc,
        iter_supported_elements,
        extract_quantities_for_element,
        get_element_meta,
    )
    from .rules.matcher import load_mapping, classify_element
    from .boq.builder import rows_to_dataframe, aggregate_dataframe
    from .validation.checks import validate_ifc_model

    model = open_ifc(ifc_path)

    mapping = load_mapping(mapping_path)

    # Basic validation
    validate_ifc_model(model)

    rows: List[Dict] = []
    for el in iter_supported_elements(model, SUPPORTED_CLASSES):
        # Classification (element_type, unit, code, desc_tpl, qty_mode)
        cls = el.is_a()
        meta = get_element_meta(el)
        class_info = classify_element(cls, meta, mapping)
        unit = class_info.get("unit") or "piece"
        code = class_info.get("code")
        qty_mode = class_info.get("quantity", "auto")
        desc_tpl = class_info.get("description") or "{element_type} – {name}"

        q = extract_quantities_for_element(el, qty_mode=qty_mode)
        if q is None:
            # Skip elements without measurable quantity
            logger.debug("Skipping %s without measurable qty (name=%s id=%s)", cls, meta["name"], meta["global_id"])
            continue

        element_type = class_info["element_type"]
        description = desc_tpl.format(
            element_type=element_type,
            ifc_class=cls,
            name=meta["name"] or meta["type"] or cls,
            type=meta["type"] or "",
        )

        rows.append({
            "element_type": element_type,
            "description": description,
            "unit": unit,
            "qty": float(q),
            "code": code or None,
            "source": meta["source"],
        })

    df = rows_to_dataframe(rows)
    if df.empty:
        logger.warning("No BoQ rows were produced from IFC: %s", ifc_path)
        return df

    return aggregate_dataframe(df)


def export_boq(df: pd.DataFrame, out_path: Path) -> None:
    """
    Simple CSV/XLSX export (mirrors v0). XLSX if available, else CSV.
    """
    if out_path.suffix.lower() == ".xlsx":
        try:
            import openpyxl  # noqa: F401
            df.to_excel(out_path, index=False)
            return
        except Exception:
            out_path = out_path.with_suffix(".csv")
    df.to_csv(out_path, index=False)
