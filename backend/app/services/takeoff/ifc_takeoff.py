from typing import List, Dict
import random


def run_ifc_takeoff(file_path: str) -> List[Dict]:
    """
    Proof-of-concept IFC take-off for walls/slabs (deterministic mock).
    """
    random.seed(hash(file_path) % 10_000)
    walls_m = round(100 + random.random() * 50, 2)
    slabs_m2 = round(200 + random.random() * 120, 2)
    return [
        {"code": "E10/100", "description": "External walls", "unit": "m", "qty": walls_m, "source_ref": "IFCWall"},
        {"code": "E20/200", "description": "Slabs", "unit": "m2", "qty": slabs_m2, "source_ref": "IFCSlab"},
    ]
