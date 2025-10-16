
from pathlib import Path
import yaml

def load_mapping(path: Path) -> dict:
    data = yaml.safe_load(path.read_text(encoding='utf-8'))
    return data or {}
