
from __future__ import annotations
from pathlib import Path
from typing import Dict, List
import subprocess, shutil, math

Item = Dict[str, object]

def _has_cmd(names):
    for n in names:
        if shutil.which(n):
            return n
    return None

def _convert_dwg_to_dxf(path: Path) -> Path:
    """Use ODA File Converter if available. Returns path to a temporary DXF next to DWG."""
    exe = _has_cmd(['ODAFileConverter','odafileconverter','odafc'])
    if not exe:
        raise RuntimeError("ODA File Converter not found on PATH. Install it or save DWG as DXF.")
    out_dxf = path.with_suffix('.converted.dxf')
    # Many ODA CLIs accept: ODAFileConverter <in> <out_dir> <outVer> <outType> <recurse> <audit>
    # Some provide `odafc` wrapper used by ezdxf; attempt that first.
    try:
        # Try the 'odafc' simple call first (ezdxf style)
        if exe == 'odafc':
            subprocess.check_call([exe, 'convert', str(path), str(out_dxf)])
            return out_dxf
    except Exception:
        pass
    # Fallback generic call: convert single file to R2018 DXF
    out_dir = str(path.parent)
    try:
        subprocess.check_call([exe, str(path.parent), out_dir, 'ACAD2018', 'DXF', '0', '1'])
        # Find any produced DXF with same stem
        cand = Path(out_dir) / (path.stem + '.dxf')
        if cand.exists():
            return cand
    except Exception as e:
        raise RuntimeError(f"ODA conversion failed: {e}")
    raise RuntimeError("Failed to produce DXF from DWG.")

def _open_dxf(path: Path):
    try:
        import ezdxf
    except Exception as e:
        raise RuntimeError("ezdxf is required: pip install ezdxf") from e
    return ezdxf.readfile(str(path))

def _insunits_to_scale(doc) -> float:
    # DXF header $INSUNITS: 1=inches, 2=feet, 4=mm, 6=meters, etc.
    try:
        code = int(doc.header.get('$INSUNITS', 6))
    except Exception:
        code = 6
    # map to meters
    table = {0:1.0, 1:0.0254, 2:0.3048, 3:1.0, 4:0.001, 5:0.01, 6:1.0, 7:0.1, 8:0.0000254, 9:0.0003048}
    return table.get(code, 1.0)

def _poly_length(e) -> float:
    try:
        if e.dxftype() in ('LINE','ARC','CIRCLE'):
            if e.dxftype() == 'LINE':
                p1 = e.dxf.start; p2 = e.dxf.end
                return ((p1.x-p2.x)**2 + (p1.y-p2.y)**2 + (p1.z-p2.z)**2)**0.5
            # Arcs/circles: approximate length by radius*angle
            if e.dxftype() == 'CIRCLE':
                import math
                return 2*math.pi*e.dxf.radius
            if e.dxftype() == 'ARC':
                import math
                ang = abs(e.dxf.end_angle - e.dxf.start_angle)*math.pi/180.0
                return ang * e.dxf.radius
        if e.dxftype() in ('LWPOLYLINE','POLYLINE'):
            pts = [tuple(p[0:2]) for p in e.get_points()] if e.dxftype()=='LWPOLYLINE' else [tuple(v.dxf.location[0:2]) for v in e.vertices]
            import math
            L = 0.0
            for a,b in zip(pts, pts[1:]):
                L += ((a[0]-b[0])**2 + (a[1]-b[1])**2)**0.5
            if getattr(e, 'closed', False) or getattr(e.dxf,'flags',0) & 1:
                a,b = pts[-1], pts[0]
                L += ((a[0]-b[0])**2 + (a[1]-b[1])**2)**0.5
            return L
    except Exception:
        return 0.0
    return 0.0

def extract_dwg_or_dxf(path: Path, layer_map: dict, block_map: dict) -> List[Item]:
    # Convert DWG→DXF if needed
    p = Path(path)
    if p.suffix.lower() == '.dwg':
        p = _convert_dwg_to_dxf(p)
    doc = _open_dxf(p)
    scale = _insunits_to_scale(doc)

    items: List[Item] = []

    def add(code, desc, unit, qty, src):
        items.append({'code':code,'description':desc,'unit':unit,'qty':round(qty,3),'source':src})

    # 1) Linear features by layer (pipes, cables)
    # layer_map example:
    #   'Layer:Pipe': {type:'pipe', code:'PIP', unit:'m'}
    #   'Layer:Cable': {type:'cable', code:'CAB', unit:'m'}
    MLINE = set(['LINE','LWPOLYLINE','POLYLINE','ARC','CIRCLE'])
    for e in doc.modelspace().query('*'):
        lt = e.dxftype()
        if lt not in MLINE and lt != 'INSERT':
            continue
        layer = str(e.dxf.layer) if hasattr(e.dxf,'layer') else ''
        lay_conf = layer_map.get(layer) or layer_map.get(layer.upper()) or None
        if lay_conf and lt in MLINE:
            L = _poly_length(e) * scale
            if L > 0:
                add(lay_conf.get('code','UNK'), lay_conf.get('description', f"{lay_conf.get('type','linear')} on {layer}"),
                    lay_conf.get('unit','m'), L, f"DXF:{layer}:{lt}")

    # 2) Blocks count by block name (devices/fixtures)
    # block_map example:
    #   'SINK': {code:'FIX-SAN', unit:'item', description:'Sink'}
    #   'SWITCH_1W': {code:'SW', unit:'item', description:'Switch 1-way'}
    for e in doc.modelspace().query('INSERT'):
        name = str(e.dxf.name).upper()
        conf = None
        if name in block_map:
            conf = block_map[name]
        else:
            # fallback: try by layer mapping if no explicit block mapping
            layer = str(e.dxf.layer) if hasattr(e.dxf,'layer') else ''
            conf = layer_map.get(layer)
        if conf:
            add(conf.get('code','UNK'), conf.get('description', f"{name}"), conf.get('unit','item'), 1, f"DXF:BLK:{name}")

    return items
