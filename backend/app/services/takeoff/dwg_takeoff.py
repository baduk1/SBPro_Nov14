from typing import List, Dict
import random


def run_dwg_takeoff(file_path: str) -> List[Dict]:
    """
    DWG profiled-layer take-off focused on Electrical & Water for apartments/interiors.
    Deterministic mock returning lengths of duct/pipe/cable.
    """
    random.seed(hash(file_path) % 10_000)
    duct_m = round(80 + random.random() * 30, 2)
    pipe_m = round(120 + random.random() * 60, 2)
    cable_m = round(200 + random.random() * 90, 2)
    return [
        {"code": None, "description": "Ductwork (Layer:Duct)", "unit": "m", "qty": duct_m, "source_ref": "Layer:Duct"},
        {"code": None, "description": "Piping (Layer:Pipe)", "unit": "m", "qty": pipe_m, "source_ref": "Layer:Pipe"},
        {"code": None, "description": "Cabling (Layer:Cable)", "unit": "m", "qty": cable_m, "source_ref": "Layer:Cable"},
    ]
