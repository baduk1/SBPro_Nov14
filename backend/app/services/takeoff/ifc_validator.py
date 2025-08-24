from typing import Tuple


def validate_ifc(file_path: str) -> Tuple[bool, list[str]]:
    """
    Minimal IFC validator stub for MVP.
    Accept all IFCs; add a warning if filename hints issues.
    """
    warnings: list[str] = []
    if "bad" in file_path.lower():
        warnings.append("Filename suggests demo warning: 'bad'.")
    return True, warnings
