
from pathlib import Path

def detect_kind(path: Path) -> str:
    ext = path.suffix.lower().strip('.')
    if ext == 'ifc' or ext == 'ifczip' or ext == 'ifcxml':
        return 'ifc'
    if ext in ('dwg','dxf'):
        return ext
    if ext in ('pdf',):
        return 'pdf'
    return 'unknown'
