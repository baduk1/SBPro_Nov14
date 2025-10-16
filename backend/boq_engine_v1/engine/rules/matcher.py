from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional

import logging

import yaml

logger = logging.getLogger(__name__)


def load_mapping(path: Path) -> Dict:
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    data.setdefault("ifc_classes", {})
    data.setdefault("overrides", [])
    return data


def classify_element(ifc_class: str, meta: Dict[str, str], mapping: Dict) -> Dict:
    """Resolve element_type/unit/code/description/quantity using mapping and overrides."""
    # 1) Overrides
    name = (meta.get("name") or "").lower()
    typ = (meta.get("type") or "").lower()
    for ov in mapping.get("overrides", []):
        if ov.get("ifc_class") and ov["ifc_class"].lower() != ifc_class.lower():
            continue
        if ov.get("ifc_type") and ov["ifc_type"].lower() not in typ:
            continue
        if ov.get("name_contains") and ov["name_contains"].lower() not in name:
            continue
        # matched
        out = {
            "element_type": ov.get("element_type") or ifc_class,
            "unit": ov.get("unit"),
            "code": ov.get("code"),
            "description": ov.get("description"),
            "quantity": ov.get("quantity") or "auto",
        }
        return out

    # 2) Class mapping
    base = mapping.get("ifc_classes", {}).get(ifc_class, {})
    if base:
        return {
            "element_type": base.get("element_type") or ifc_class,
            "unit": base.get("unit"),
            "code": base.get("code"),
            "description": base.get("description"),
            "quantity": base.get("quantity") or "auto",
        }

    # 3) Fallback
    return {
        "element_type": ifc_class,
        "unit": "piece",
        "code": None,
        "description": "{element_type} – {name}",
        "quantity": "auto",
    }
