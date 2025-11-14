from __future__ import annotations

import fnmatch
import logging
import math
import os
import tempfile
from collections import defaultdict
from typing import Dict, List, Tuple, Any, Iterable

logger = logging.getLogger(__name__)

_INSUNITS_TO_M = {
    0: float("nan"),
    1: 0.0254,
    2: 0.3048,
    3: 1609.344,
    4: 0.001,
    5: 0.01,
    6: 1.0,
    7: 1000.0,
    8: 1e-6,
    9: 0.0000254,
    10: 1e-19,
}


def _resolve_units_override(units: Optional[str]) -> float | None:
    if not units:
        return None
    u = units.strip().lower()
    if u in {"m", "meter", "meters", "metre", "metres"}:
        return 1.0
    if u in {"mm", "millimeter", "millimeters"}:
        return 0.001
    if u in {"cm", "centimeter", "centimeters"}:
        return 0.01
    if u in {"km", "kilometer", "kilometers"}:
        return 1000.0
    if u in {"ft", "foot", "feet"}:
        return 0.3048
    if u in {"in", "inch", "inches"}:
        return 0.0254
    return None


def _open_drawing(path: str):
    import ezdxf

    ext = os.path.splitext(path)[1].lower()
    if ext == ".dxf":
        return ezdxf.readfile(path)

    if ext == ".dwg":
        try:
            from ezdxf.addons import odafc
        except Exception:
            raise RuntimeError(
                "DWG opening requires ezdxf.addons.odafc (ODA File Converter). Convert DWG to DXF (R2018) or install odafc."
            )
        with tempfile.TemporaryDirectory() as td:
            dxf_path = odafc.convert_dwg(path, outdir=td, fmt="R2018")
            return ezdxf.readfile(dxf_path)

    raise RuntimeError(f"Unsupported CAD extension: {ext}")


def _drawing_scale_to_m(doc, units_override: Optional[str]) -> float:
    ov = _resolve_units_override(units_override)
    if ov is not None:
        return ov
    code = int(doc.header.get("$INSUNITS", 0) or 0)
    scale = _INSUNITS_TO_M.get(code, float("nan"))
    if math.isnan(scale) or scale <= 0:
        logger.warning("DXF/DWG units unresolved ($INSUNITS=%s); assuming millimetres.", code)
        return 0.001
    return scale


def _polyline_length(points: List[Tuple[float, float, float]], bulges: List[float]) -> float:
    if not points:
        return 0.0
    closed = (points[0] == points[-1])
    total = 0.0
    n = len(points)
    iters = range(n - 1) if not closed else range(n)
    for i in iters:
        p1 = points[i]
        p2 = points[(i + 1) % n]
        chord = math.dist((p1[0], p1[1]), (p2[0], p2[1]))
        b = bulges[i] if i < len(bulges) else 0.0
        if abs(b) < 1e-12:
            total += chord
        else:
            theta = 4.0 * math.atan(b)
            sin_half = math.sin(theta / 2.0)
            if abs(sin_half) < 1e-12:
                total += chord
            else:
                R = chord / (2.0 * sin_half)
                total += abs(theta) * abs(R)
    return total


def _entity_length_m(e, scale_to_m: float) -> float:
    dxf = getattr(e, "dxf", None)
    tp = e.dxftype()
    if tp == "LINE":
        p1, p2 = dxf.start, dxf.end
        return math.dist((p1.x, p1.y, p1.z), (p2.x, p2.y, p2.z)) * scale_to_m
    if tp in {"LWPOLYLINE"}:
        pts = [(p[0], p[1], 0.0) for p in e.get_points("xy")]
        bulges = [p[2] for p in e.get_points("xyb")] if hasattr(e, "get_points") else [0.0] * max(0, len(pts) - 1)
        return _polyline_length(pts, bulges) * scale_to_m
    if tp in {"POLYLINE"}:
        pts = [(v.dxf.location.x, v.dxf.location.y, v.dxf.location.z) for v in e.vertices]  # type: ignore
        total = 0.0
        for i in range(len(pts) - 1):
            total += math.dist(pts[i], pts[i + 1])
        if getattr(e, "is_closed", False):
            total += math.dist(pts[-1], pts[0])
        return total * scale_to_m
    if tp == "ARC":
        r = float(dxf.radius or 0.0)
        start = math.radians(float(dxf.start_angle or 0.0))
        end = math.radians(float(dxf.end_angle or 0.0))
        theta = end - start
        if theta < 0:
            theta += 2 * math.pi
        return abs(theta) * r * scale_to_m
    if tp == "SPLINE":
        try:
            ct = e.construction_tool()  # type: ignore
            pts = ct.approximate(100)
            total = 0.0
            for i in range(len(pts) - 1):
                total += math.dist(pts[i], pts[i + 1])
            return total * scale_to_m
        except Exception:
            return 0.0
    return 0.0


def _match_name(name: str, patterns: Iterable[str]) -> str | None:
    n = (name or "").upper()
    for p in patterns:
        if fnmatch.fnmatch(n, p.upper()):
            return p
    return None


def _collect_linear_by_layers(msp, layer_map: Dict[str, Dict[str, Any]], scale_to_m: float):
    out = defaultdict(float)
    tracked_layers = list(layer_map.keys())
    seen_layers = set()

    for e in msp:
        layer = getattr(getattr(e, "dxf", None), "layer", None) or ""
        if not layer:
            continue
        pat = _match_name(layer, tracked_layers)
        if not pat:
            continue
        seen_layers.add(pat)
        L = _entity_length_m(e, scale_to_m)
        if L <= 0:
            continue
        meta = layer_map[pat]
        key = (meta.get("code"), meta.get("description"), meta.get("unit") or "m", f"Layer:{layer} (ModelSpace)")
        out[key] += L

    missing = [p for p in tracked_layers if p not in seen_layers]
    for p in missing:
        logger.warning("Layer from mapping not found: %s", p)

    rows = []
    for (code, desc, unit, src), qty in out.items():
        rows.append({
            "code": (code or None),
            "description": desc or f"Layer {src}",
            "unit": unit or "m",
            "qty": round(qty, 2),
            "source_ref": src,
        })
    return rows


def _count_blocks(doc, msp, block_map: Dict[str, Dict[str, Any]], max_depth: int, scale_warn: bool = True):
    from ezdxf.entities import Insert  # type: ignore

    patterns = list(block_map.keys())
    counts = defaultdict(int)

    def visit_insert(ins, depth: int):
        if depth > max_depth:
            return
        name = (getattr(ins.dxf, "name", "") or "").upper()
        pat = _match_name(name, patterns)
        if pat:
            counts[pat] += 1
            if scale_warn:
                xs, ys = float(ins.dxf.xscale or 1.0), float(ins.dxf.yscale or 1.0)
                if abs(xs - ys) > 1e-6:
                    logger.warning("Block '%s' inserted with non-uniform scale x=%.3f, y=%.3f", name, xs, ys)
        try:
            block_def = doc.blocks.get(name)
        except Exception:
            return
        for e in block_def:
            if e.dxftype() == "INSERT":
                visit_insert(e, depth + 1)

    for e in msp.query("INSERT"):
        visit_insert(e, 1)

    rows = []
    for pat, n in counts.items():
        meta = block_map[pat]
        src = f"Block:{pat} (ModelSpace)"
        rows.append({
            "code": meta.get("code"),
            "description": meta.get("description") or f"Block {pat}",
            "unit": meta.get("unit") or "pcs",
            "qty": int(n),
            "source_ref": src,
        })
    for p in patterns:
        if p not in counts:
            logger.warning("Block pattern not found: %s", p)
    return rows


def run_dwg_takeoff(
    file_path: str,
    mapping: dict | None = None,
    units: Optional[str] = None,
) -> List[dict]:
    try:
        doc = _open_drawing(file_path)
    except Exception as e:
        logger.exception("DXF/DWG open error: %s", e)
        raise RuntimeError("Unable to open DXF/DWG. Check compatibility or convert to DXF.") from e

    scale_to_m = _drawing_scale_to_m(doc, units_override=units)
    msp = doc.modelspace()

    mapping = mapping or {}
    layer_map = {}
    for k, v in (mapping.get("layers") or {}).items():
        layer_map[str(k)] = {
            "code": v.get("code"),
            "description": v.get("description") or v.get("element_type") or f"Layer {k}",
            "unit": v.get("unit") or "m",
        }
    block_map = {}
    for k, v in (mapping.get("blocks") or {}).items():
        block_map[str(k)] = {
            "code": v.get("code"),
            "description": v.get("description") or f"Block {k}",
            "unit": v.get("unit") or "pcs",
        }

    rows = []
    if layer_map:
        rows.extend(_collect_linear_by_layers(msp, layer_map, scale_to_m))
    if block_map:
        rows.extend(_count_blocks(doc, msp, block_map, max_depth=5))

    if not rows:
        lengths = defaultdict(float)
        for e in msp:
            L = _entity_length_m(e, scale_to_m)
            if L > 0:
                layer = getattr(getattr(e, "dxf", None), "layer", None) or "UNLAYERED"
                lengths[layer] += L
        top = sorted(lengths.items(), key=lambda kv: kv[1], reverse=True)[:10]
        for layer, L in top:
            rows.append({
                "code": None,
                "description": f"Linear on layer {layer}",
                "unit": "m",
                "qty": round(L, 2),
                "source_ref": f"Layer:{layer} (ModelSpace)",
            })

    return rows
