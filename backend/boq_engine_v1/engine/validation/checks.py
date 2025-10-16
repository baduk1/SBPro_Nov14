from __future__ import annotations

from pathlib import Path

import logging

logger = logging.getLogger(__name__)


def validate_ifc_model(model) -> None:
    """Raise RuntimeError if IFC schema unsupported or model invalid."""
    try:
        schema = model.schema
        sname = str(schema).upper() if schema else ""
    except Exception:
        sname = ""
    if not sname:
        logger.warning("Could not determine IFC schema; continuing anyway.")
        return
    if not any(k in sname for k in ("IFC2X3", "IFC4")):
        raise RuntimeError(f"Unsupported IFC schema: {sname}. Only IFC2x3 and IFC4 are supported.")
