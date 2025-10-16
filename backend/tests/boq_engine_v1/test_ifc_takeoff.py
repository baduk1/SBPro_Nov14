import os
import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

try:
    import ifcopenshell  # noqa: F401
except Exception:  # pragma: no cover - dependency optional in CI
    ifcopenshell = None

from boq_engine_v1.engine.api import run_takeoff


@pytest.mark.skipif(ifcopenshell is None, reason="ifcopenshell not installed")
@pytest.mark.parametrize("filename", [
    "Ifc2x3_Duplex_Architecture.ifc",
    "Ifc2x3_Duplex_Mechanical.ifc",
    "Ifc2x3_Duplex_Electrical.ifc",
    "Ifc2s3_Duplex_Electrical.ifc",
    "Ifc4_SampleHouse.ifc",
])
def test_takeoff_runs_on_fixture(filename: str):
    root = Path(__file__).resolve().parents[2]
    candidates = [
        root / "tests" / "data" / filename,
        Path(os.environ.get("IFC_FIXTURES_DIR", "")) / filename,
        Path("/mnt/data") / filename,
    ]
    fpath = next((p for p in candidates if p.is_file()), None)
    if fpath is None:
        pytest.skip(f"Fixture {filename} not found")

    mapping_candidates = [
        root / "boq_engine_v1" / "config" / "mapping.yml",
        root / "boq_engine_v1" / "config" / "mapping.example.yml",
        Path("/mnt/data/mapping.yml"),
    ]
    mpath = next((p for p in mapping_candidates if p.is_file()), None)
    assert mpath is not None, "mapping.yml not found"

    df = run_takeoff(fpath, mpath)
    assert set(["element_type", "description", "unit", "qty", "code", "source"]).issubset(df.columns)
    assert not df.empty
