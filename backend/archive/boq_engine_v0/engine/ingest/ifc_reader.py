
from __future__ import annotations
from pathlib import Path
from typing import Dict, List
import math

Item = Dict[str, object]

def _load_ifc(path: Path):
    try:
        import ifcopenshell
    except Exception as e:
        raise RuntimeError("ifcopenshell is required: pip install ifcopenshell") from e
    return ifcopenshell.open(str(path))

def _get_model_units(ifc):
    try:
        # Get length unit (defaults to meters if not found)
        uos = ifc.by_type("IfcUnitAssignment")
        if uos:
            for unit in uos[0].Units:
                if unit.is_a('IfcSIUnit') and unit.UnitType == 'LENGTHUNIT':
                    nm = getattr(unit, 'Name', 'METRE')
                    if nm and 'MILLI' in getattr(unit, 'Prefix', ''):
                        return 0.001
                    return 1.0  # metre
    except Exception:
        pass
    return 1.0

def _quantity_length_from_qto(el) -> float | None:
    # Try standardized quantities first
    try:
        for rel in getattr(el, 'IsDefinedBy', []) or []:
            qset = getattr(rel, 'RelatingPropertyDefinition', None)
            if qset and qset.is_a('IfcElementQuantity'):
                for q in qset.Quantities or []:
                    if q.is_a('IfcQuantityLength'):
                        return float(q.LengthValue or 0.0)
    except Exception:
        return None
    return None

def _simple_path_length(el) -> float | None:
    """Best-effort geometric length for linear segments without full geom engine.
    Uses axis placement of ports or straight profile parameters if present.
    """
    try:
        # Many distribution segments have two ports (0 and 1). Measure their distance.
        ports = getattr(el, 'HasPorts', None)
        if not ports:
            return None
        conn = [p.RelatedPort for p in ports if getattr(p, 'RelatedPort', None)]
        if len(conn) < 2:
            return None
        import ifcopenshell.util.element as util_el
        import ifcopenshell.util.placement as util_pl
        co = []
        for rp in conn[:2]:
            prod = util_el.get_container(rp)
            place = util_pl.get_local_placement(prod.ObjectPlacement)
            co.append(place.Location.Coordinates)
        if len(co) == 2:
            dx = co[0][0]-co[1][0]; dy = co[0][1]-co[1][1]; dz = co[0][2]-co[1][2]
            return (dx*dx+dy*dy+dz*dz)**0.5
    except Exception:
        return None
    return None

def _add_item(items: List[Item], code: str, desc: str, unit: str, qty: float, src: str):
    if qty is None:
        return
    items.append({
        'code': code,
        'description': desc,
        'unit': unit,
        'qty': round(float(qty), 3),
        'source': src
    })

def extract_ifc(path: Path, ifc_map: dict) -> List[Item]:
    """Extract quantities from IFC for plumbing (pipes, terminals) and electrical (cables, devices).

    `ifc_map` maps IFC entity names to defaults, e.g.:
      PipeSegment:
        code: 'PIP'
        unit: 'm'
      SanitaryTerminal:
        code: 'FIX-SAN'
        unit: 'item'
      CableSegment:
        code: 'CAB'
        unit: 'm'
      LightFixture:
        code: 'LUM'
        unit: 'item'
    """
    ifc = _load_ifc(path)
    scale = _get_model_units(ifc)  # to metres
    items: List[Item] = []

    def get_def(name: str, key: str, default=None):
        return ((ifc_map.get(name) or {}).get(key)) or default

    # Pipe segments (linear length)
    for ent in ifc.by_type('IfcPipeSegment') or []:
        L = _quantity_length_from_qto(ent)
        if L is None:
            L = _simple_path_length(ent)
        if L is None:
            continue
        L *= scale
        _add_item(items, get_def('PipeSegment','code','PIP'),
                  f"Pipe segment ({getattr(ent,'PredefinedType', None) or 'NA'})",
                  get_def('PipeSegment','unit','m'), L, f"IFC:{ent.id()}")

    # Plumbing fixtures (count)
    for ent in ifc.by_type('IfcSanitaryTerminal') or []:
        _add_item(items, get_def('SanitaryTerminal','code','FIX-SAN'),
                  f"Sanitary terminal ({getattr(ent,'PredefinedType', None) or 'NA'})",
                  get_def('SanitaryTerminal','unit','item'), 1, f"IFC:{ent.id()}")

    # Cable segments (linear)
    for ent in ifc.by_type('IfcCableSegment') or []:
        L = _quantity_length_from_qto(ent) or _simple_path_length(ent)
        if L is None:
            continue
        L *= scale
        _add_item(items, get_def('CableSegment','code','CAB'),
                  f"Cable segment ({getattr(ent,'PredefinedType', None) or 'NA'})",
                  get_def('CableSegment','unit','m'), L, f"IFC:{ent.id()}")

    # Electrical devices (count): outlets, switches, light fixtures, distribution boards
    for name, code, unit, desc_tmpl in [
        ('IfcOutlet','OUT','item','Outlet'),
        ('IfcSwitchingDevice','SW','item','Switch'),
        ('IfcLightFixture','LUM','item','Light fixture'),
        ('IfcElectricDistributionBoard','DB','item','Distribution board')
    ]:
        for ent in ifc.by_type(name) or []:
            _add_item(items, get_def(name.split('Ifc')[-1],'code',code),
                      desc_tmpl, get_def(name.split('Ifc')[-1],'unit',unit), 1, f"IFC:{ent.id()}" )

    return items
