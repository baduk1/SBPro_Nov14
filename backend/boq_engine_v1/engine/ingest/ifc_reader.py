from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable, Iterator, Optional, Tuple

import logging

logger = logging.getLogger(__name__)


def open_ifc(path: Path):
    import ifcopenshell  # type: ignore
    try:
        model = ifcopenshell.open(str(path))
        if model is None:
            raise RuntimeError(f"Failed to open IFC file: {path}")
        return model
    except Exception as e:
        raise RuntimeError(f"Unable to open IFC file '{path}': {e}") from e


def iter_supported_elements(model, class_names: Iterable[str]) -> Iterator[object]:
    """Yield elements with IsDeleted flag false (if present) across the supported class list."""
    for cls in class_names:
        try:
            for el in model.by_type(cls) or []:
                if getattr(el, "IsDeleted", False):
                    continue
                yield el
        except Exception:
            # Some schemas might not have the class; ignore
            continue


def _get_inverse(model, el):
    if model is not None:
        try:
            return model.get_inverse(el)
        except Exception:
            pass
    try:
        return el.get_inverse()
    except Exception:
        return []


def _get_storey(el) -> Optional[object]:
    """Try to find containing IfcBuildingStorey for an element."""
    base_model = None
    if hasattr(el, "wrapped_data"):
        base_model = getattr(el.wrapped_data, "model", None)
    if base_model is None and hasattr(el, "model"):
        base_model = getattr(el, "model", None)

    for inv in _get_inverse(base_model, el):
        try:
            if inv.is_a("IfcRelContainedInSpatialStructure"):
                if inv.RelatingStructure and inv.RelatingStructure.is_a("IfcBuildingStorey"):
                    return inv.RelatingStructure
        except Exception:
            continue
    return None


def get_element_meta(el) -> Dict[str, Optional[str]]:
    """Return common metadata needed for description & source."""
    cls = el.is_a()
    name = getattr(el, "Name", None)
    type_name = None
    try:
        type_name = getattr(el, "ObjectType", None) or getattr(el, "PredefinedType", None)
        # PredefinedType in IFC is often an enum; ensure str
        if type_name and not isinstance(type_name, str):
            type_name = str(type_name)
    except Exception:
        pass

    gid = getattr(el, "GlobalId", None) or getattr(el, "GlobalID", None)
    s = _get_storey(el)
    storey_name = getattr(s, "Name", None) if s is not None else None
    source_bits = [b for b in [gid, storey_name] if b]
    return {
        "ifc_class": cls,
        "name": name,
        "type": type_name,
        "global_id": gid,
        "storey": storey_name,
        "source": "; ".join(source_bits) if source_bits else gid or "",
    }


def _qto_lookup(el, names: Tuple[str, ...]):
    """Search BaseQuantities for provided quantity names (order matters)."""
    base_model = None
    if hasattr(el, "wrapped_data"):
        base_model = getattr(el.wrapped_data, "model", None)
    if base_model is None and hasattr(el, "model"):
        base_model = getattr(el, "model", None)

    for inv in _get_inverse(base_model, el):
        try:
            if inv.is_a("IfcRelDefinesByProperties"):
                prop = inv.RelatingPropertyDefinition
                if prop and prop.is_a("IfcElementQuantity"):
                    if getattr(prop, "Name", "") and "BaseQuantities" not in str(prop.Name):
                        # Not a base quantity set; still consider
                        pass
                    for q in getattr(prop, "Quantities", []) or []:
                        n = getattr(q, "Name", "")
                        if not n:
                            continue
                        for target in names:
                            if n.lower() == target.lower():
                                # Extract numeric value based on q type
                                if q.is_a("IfcQuantityArea"):
                                    return float(getattr(q, "AreaValue", 0.0) or 0.0)
                                if q.is_a("IfcQuantityVolume"):
                                    return float(getattr(q, "VolumeValue", 0.0) or 0.0)
                                if q.is_a("IfcQuantityLength"):
                                    return float(getattr(q, "LengthValue", 0.0) or 0.0)
                                if q.is_a("IfcQuantityCount"):
                                    return float(getattr(q, "CountValue", 0.0) or 0.0)
        except Exception:
            continue
    return None


def _get_length_scale(el) -> float:
    """
    Convert model length units -> metres (best effort). Defaults to 1.0 (m).
    """
    base_model = None
    if hasattr(el, "wrapped_data"):
        base_model = getattr(el.wrapped_data, "model", None)
    if base_model is None and hasattr(el, "model"):
        base_model = getattr(el, "model", None)
    if base_model is None:
        return 1.0
    try:
        uas = base_model.by_type("IfcUnitAssignment") or []
        if not uas:
            return 1.0
        for unit in uas[0].Units or []:
            if unit.is_a("IfcSIUnit") and getattr(unit, "UnitType", "") == "LENGTHUNIT":
                prefix = str(getattr(unit, "Prefix", "") or "").upper()
                table = {"": 1.0, "MILLI": 1e-3, "CENTI": 1e-2, "DECI": 1e-1, "KILO": 1e3}
                return float(table.get(prefix, 1.0))
            if unit.is_a("IfcConversionBasedUnit") and getattr(unit, "UnitType", "") == "LENGTHUNIT":
                name = str(getattr(unit, "Name", "") or "").upper()
                if "FOOT" in name or "FEET" in name:
                    return 0.3048
                if "INCH" in name:
                    return 0.0254
                if "YARD" in name:
                    return 0.9144
    except Exception:
        pass
    return 1.0


def _length_from_ports(el) -> Optional[float]:
    """
    Heuristic for Pipe/Duct/Cable segments: distance between first two connected ports.
    """
    try:
        ports = getattr(el, "HasPorts", None)
        if not ports:
            return None
        related = [p.RelatedPort for p in ports if getattr(p, "RelatedPort", None)]
        if len(related) < 2:
            return None
        try:
            import ifcopenshell.util.element as util_el  # type: ignore
            import ifcopenshell.util.placement as util_pl  # type: ignore
        except Exception:
            return None
        coords = []
        for rp in related[:2]:
            prod = util_el.get_container(rp)
            if not prod or not getattr(prod, "ObjectPlacement", None):
                return None
            place = util_pl.get_local_placement(prod.ObjectPlacement)
            loc = getattr(place, "Location", None)
            co = getattr(loc, "Coordinates", None) if loc else None
            if not co or len(co) < 3:
                return None
            coords.append((float(co[0]), float(co[1]), float(co[2])))
        if len(coords) == 2:
            (x1, y1, z1), (x2, y2, z2) = coords
            dx, dy, dz = x1 - x2, y1 - y2, z1 - z2
            return (dx * dx + dy * dy + dz * dz) ** 0.5
    except Exception:
        return None
    return None


def _geom_bbox_volume(el) -> Optional[float]:
    """Compute volume from triangulated geometry bounding box (rough fallback)."""
    try:
        import ifcopenshell.geom as geom  # type: ignore

        settings = geom.settings()
        settings.set(settings.USE_PYTHON_OPENCASCADE, True)  # ensure pure-python OCC if available
        shape = geom.create_shape(settings, el)
        verts = shape.geometry.verts
        if not verts:
            return None
        xs = verts[0::3]; ys = verts[1::3]; zs = verts[2::3]
        minx, maxx = min(xs), max(xs)
        miny, maxy = min(ys), max(ys)
        minz, maxz = min(zs), max(zs)
        vol = max(0.0, (maxx - minx) * (maxy - miny) * (maxz - minz))
        return float(vol)
    except Exception:
        return None


def _geom_bbox_area(el) -> Optional[float]:
    """Compute an approximate projected area from bbox (fallback for slabs, coverings)."""
    try:
        import ifcopenshell.geom as geom  # type: ignore

        settings = geom.settings()
        settings.set(settings.USE_PYTHON_OPENCASCADE, True)
        shape = geom.create_shape(settings, el)
        verts = shape.geometry.verts
        if not verts:
            return None
        xs = verts[0::3]; ys = verts[1::3]; zs = verts[2::3]
        dx = max(xs) - min(xs)
        dy = max(ys) - min(ys)
        # Assume horizontal element; area approx on XY
        area = max(0.0, dx * dy)
        return float(area)
    except Exception:
        return None


def extract_quantities_for_element(el, qty_mode: str = "auto") -> Optional[float]:
    """Return a single quantity for the element based on mode (area/volume/length/count/auto)."""

    cls = el.is_a()
    # Primary QTO name candidates by mode
    QTO_BY_MODE = {
        "area": ("NetSideArea", "NetArea", "GrossSideArea", "GrossArea", "Area"),
        "volume": ("NetVolume", "GrossVolume", "Volume"),
        "length": ("Length", "Perimeter"),
        "count": ("Count",),
        # for auto: try to infer based on class
    }

    if qty_mode == "auto":
        if cls in ("IfcDoor", "IfcWindow", "IfcStair"):
            qty_mode = "count"
        elif cls in ("IfcWall", "IfcWallStandardCase"):
            qty_mode = "area"  # side area of walls is common
        elif cls in ("IfcSlab", "IfcCovering", "IfcSpace"):
            qty_mode = "area"
        elif cls in ("IfcColumn", "IfcBeam"):
            qty_mode = "volume"
        else:
            qty_mode = "count"

    candidates = QTO_BY_MODE.get(qty_mode, ())
    if candidates:
        v = _qto_lookup(el, candidates)
        if v is not None and v > 0:
            if qty_mode == "length":
                return float(v) * _get_length_scale(el)
            return float(v)
    if qty_mode == "volume":
        v = _geom_bbox_volume(el)
        if v is not None:
            return float(v)
    if qty_mode == "area":
        v = _geom_bbox_area(el)
        if v is not None:
            return float(v)
    if qty_mode == "length":
        v = _length_from_ports(el)
        if v is not None and v > 0:
            return float(v) * _get_length_scale(el)

    if qty_mode == "count":
        return 1.0

    # length fallback? Not trivial from bbox; skip
    return None
