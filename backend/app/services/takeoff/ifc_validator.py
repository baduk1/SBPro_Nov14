from __future__ import annotations

import logging
import math
import os
from typing import Tuple, Iterable, Dict, List

logger = logging.getLogger(__name__)

SUPPORTED_SCHEMAS = {"IFC2X3", "IFC4", "IFC4X1", "IFC4X2", "IFC4X3"}
SUPPORTED_CLASSES = {
    "IfcWall", "IfcWallStandardCase", "IfcSlab", "IfcDoor", "IfcWindow",
    "IfcColumn", "IfcBeam", "IfcCovering", "IfcSpace", "IfcStair",
}


def _require_ifcopenshell():
    try:
        import ifcopenshell  # noqa: F401
    except Exception as e:  # pragma: no cover
        msg = "ifcopenshell не установлен. Установите пакет: pip install ifcopenshell"
        logger.warning(msg)
        return False, msg
    return True, None


def _get_schema(m) -> str:
    schema = (getattr(m, "schema", "") or "").upper()
    if not schema:
        try:
            raw = m.wrapped_data.header.file_schema.schema_identifiers()
            if raw:
                schema = str(raw[0]).upper()
        except Exception:
            pass
    return schema


def _si_prefix_scale(prefix: Optional[str]) -> float:
    mapping = {
        None: 1.0,
        "MILLI": 1e-3,
        "CENTI": 1e-2,
        "DECI": 1e-1,
        "DEKA": 1e1,
        "HECTO": 1e2,
        "KILO": 1e3,
        "MEGA": 1e6,
        "GIGA": 1e9,
    }
    return mapping.get((prefix or "").upper(), float("nan"))


def _length_unit_scale(m) -> float:
    try:
        projects = m.by_type("IfcProject")
        if not projects:
            return float("nan")
        uctx = projects[0].UnitsInContext
        if not uctx:
            return float("nan")
        for u in getattr(uctx, "Units", []) or []:
            if u.is_a("IfcSIUnit") and (getattr(u, "UnitType", "") == "LENGTHUNIT"):
                name = (getattr(u, "Name", "") or "").upper()
                prefix = getattr(u, "Prefix", None)
                if name == "METRE":
                    s = _si_prefix_scale(prefix)
                    return s
            if u.is_a("IfcConversionBasedUnit") and (getattr(u, "UnitType", "") == "LENGTHUNIT"):
                cf = getattr(u, "ConversionFactor", None)
                if not cf:
                    continue
                unit_comp = getattr(cf, "UnitComponent", None)
                val_comp = getattr(cf, "ValueComponent", None)
                if unit_comp and unit_comp.is_a("IfcSIUnit") and getattr(unit_comp, "Name", "").upper() == "METRE":
                    base = float(getattr(getattr(val_comp, "wrappedValue", val_comp), "real", val_comp) or 0.0)
                    s = _si_prefix_scale(getattr(unit_comp, "Prefix", None))
                    if not math.isnan(s) and base > 0:
                        return base * s
        return float("nan")
    except Exception:
        return float("nan")


def _abs_point_from_local(lp) -> List[float] | None:
    try:
        coords = [0.0, 0.0, 0.0]
        cur = lp
        while cur:
            rp = getattr(cur, "RelativePlacement", None)
            if rp and getattr(rp, "Location", None):
                xyz = list(getattr(rp.Location, "Coordinates", []) or [])
                while len(xyz) < 3:
                    xyz.append(0.0)
                coords[0] += float(xyz[0] or 0.0)
                coords[1] += float(xyz[1] or 0.0)
                coords[2] += float(xyz[2] or 0.0)
            cur = getattr(cur, "PlacementRelTo", None)
        return coords
    except Exception:
        return None


def _aabb_from_products(products: Iterable) -> Dict[str, float] | None:
    xs: List[float] = []
    ys: List[float] = []
    zs: List[float] = []
    cnt = 0
    for e in products:
        lp = getattr(e, "ObjectPlacement", None)
        if not lp:
            continue
        p = _abs_point_from_local(lp)
        if p is None:
            continue
        xs.append(p[0]); ys.append(p[1]); zs.append(p[2])
        cnt += 1
        if cnt >= 5000:
            break
    if cnt == 0:
        return None
    return {
        "min_x": min(xs), "max_x": max(xs),
        "min_y": min(ys), "max_y": max(ys),
        "min_z": min(zs), "max_z": max(zs),
    }


def _duplicate_guids(m) -> List[str]:
    seen = set()
    dups = set()
    for e in m.by_type("IfcRoot"):
        gid = getattr(e, "GlobalId", None)
        if not gid:
            continue
        if gid in seen:
            dups.add(gid)
        else:
            seen.add(gid)
    return sorted(list(dups))


def _has_base_quantities(elem) -> bool:
    try:
        for rel in getattr(elem, "IsDefinedBy", []) or []:
            if rel.is_a("IfcRelDefinesByProperties"):
                pd = getattr(rel, "RelatingPropertyDefinition", None)
                if pd and pd.is_a("IfcElementQuantity"):
                    name = (getattr(pd, "Name", "") or "").lower()
                    if "basequantities" in name.replace(" ", ""):
                        return True
    except Exception:
        return False
    return False


def validate_ifc(file_path: str) -> Tuple[bool, list[str]]:
    msgs: List[str] = []
    errors: List[str] = []

    ok, dep_msg = _require_ifcopenshell()
    if not ok:
        errors.append(dep_msg)
        return False, errors

    import ifcopenshell  # type: ignore

    if not os.path.exists(file_path):
        errors.append(f"Файл не найден: {file_path}")
        return False, errors
    try:
        if os.path.getsize(file_path) <= 0:
            errors.append("Файл пуст (0 байт).")
            return False, errors
    except Exception:
        msgs.append("Невозможно определить размер файла — продолжаем с осторожностью.")

    try:
        model = ifcopenshell.open(file_path)
    except Exception as e:
        logger.warning("Не удалось открыть IFC: %s", e)
        errors.append("IFC не открывается: файл повреждён или неподдерживаемый формат.")
        return False, msgs + errors

    schema = _get_schema(model)
    if not schema:
        errors.append("Не удалось определить IFC‑схему.")
        return False, msgs + errors
    if schema not in SUPPORTED_SCHEMAS:
        errors.append(f"Неподдерживаемая схема: {schema}. Поддержка: {', '.join(sorted(SUPPORTED_SCHEMAS))}.")
        return False, msgs + errors
    if schema in {"IFC4X1", "IFC4X2", "IFC4X3"}:
        msgs.append(f"Предупреждение: нестандартная под-версия схемы {schema} (поддерживается, но проверьте итоговые количества).")

    scale_m = _length_unit_scale(model)
    if math.isnan(scale_m) or scale_m <= 0:
        msgs.append("Предупреждение: длиновые единицы не распознаны; предполагаем метры.")
        scale_m = 1.0

    products = model.by_type("IfcProduct")
    if not products:
        errors.append("В файле нет экземпляров IfcProduct.")
        return False, msgs + errors
    storeys = model.by_type("IfcBuildingStorey")
    if not storeys:
        errors.append("В файле отсутствуют IfcBuildingStorey (нет уровней/этажей).")
        return False, msgs + errors

    aabb = _aabb_from_products(products)
    if not aabb:
        errors.append("Не удалось вычислить габариты модели (degenerate AABB).")
        return False, msgs + errors

    dx = abs((aabb["max_x"] - aabb["min_x"]) * scale_m)
    dy = abs((aabb["max_y"] - aabb["min_y"]) * scale_m)
    dz = abs((aabb["max_z"] - aabb["min_z"]) * scale_m)
    max_dim = max(dx, dy, dz)
    if max_dim < 0.001:
        errors.append("Габариты модели нереалистично малы (< 1 мм).")
        return False, msgs + errors
    if max_dim > 1000:
        msgs.append("Предупреждение: габариты модели > 1 км — проверьте единицы/масштаб.")

    dups = _duplicate_guids(model)
    if dups:
        preview = ", ".join(dups[:10]) + (" ..." if len(dups) > 10 else "")
        errors.append(f"Найдены дублирующиеся GlobalId: {preview}")
        return False, msgs + errors

    has_supported = any(model.by_type(cls) for cls in SUPPORTED_CLASSES)
    if not has_supported:
        errors.append(
            "В модели нет поддерживаемых элементов (стены, перекрытия, двери/окна и т.п.). "
            "Добавьте/экспортируйте соответствующие элементы."
        )
        return False, msgs + errors

    top_warnings: List[str] = []

    walls = (model.by_type("IfcWallStandardCase") or []) + (model.by_type("IfcWall") or [])
    miss_bq = []
    for w in walls[:200]:
        if not _has_base_quantities(w):
            gid = getattr(w, "GlobalId", None) or "<?>"
            miss_bq.append(gid)
            if len(miss_bq) >= 10:
                break
    if miss_bq:
        top_warnings.append(f"У {len(miss_bq)} стен отсутствуют BaseQuantities (пример GUID: {', '.join(miss_bq[:5])}).")

    no_storey: List[str] = []
    try:
        rels = model.by_type("IfcRelContainedInSpatialStructure")
        contained: Dict[int, bool] = {}
        for r in rels:
            rs = getattr(r, "RelatingStructure", None)
            if rs and rs.is_a("IfcBuildingStorey"):
                for el in getattr(r, "RelatedElements", []) or []:
                    contained[id(el)] = True
        for cls in ["IfcDoor", "IfcWindow", "IfcSlab", "IfcColumn", "IfcBeam"] + list(SUPPORTED_CLASSES):
            for e in (model.by_type(cls) or [])[:200]:
                if id(e) not in contained:
                    gid = getattr(e, "GlobalId", None) or "<?>"
                    no_storey.append(f"{cls}:{gid}")
                    if len(no_storey) >= 10:
                        raise StopIteration
    except StopIteration:
        pass
    except Exception:
        pass
    if no_storey:
        top_warnings.append(
            "Некоторые элементы не привязаны к этажам (пример: " + ", ".join(no_storey[:5]) + ")."
        )

    msgs.extend(top_warnings)
    is_valid = len(errors) == 0
    if not is_valid:
        for e in errors:
            logger.warning("IFC validation error: %s", e)
    else:
        for w in msgs:
            logger.debug("IFC validation warning: %s", w)
    return is_valid, msgs
