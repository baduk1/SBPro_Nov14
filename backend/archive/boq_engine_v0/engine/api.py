
from pathlib import Path
from typing import Optional
import pandas as pd
from .ingest.detect import detect_kind
from .ingest.ifc_reader import extract_ifc
from .ingest.dwg_reader import extract_dwg_or_dxf
from .boq.builder import build_boq, join_prices
from .utils.io import load_mapping

def run_takeoff(input_path: Path, mapping_path: Path, price_path: Optional[Path]=None) -> pd.DataFrame:
    kind = detect_kind(input_path)
    mapping = load_mapping(mapping_path)

    if kind == 'ifc':
        items = extract_ifc(input_path, mapping.get('ifc', {}))
    elif kind in ('dwg','dxf'):
        items = extract_dwg_or_dxf(input_path, mapping.get('dwg_layers', {}), mapping.get('blocks', {}))
    else:
        raise ValueError(f"Unsupported input: {input_path}")

    df = build_boq(items)
    if price_path:
        df = join_prices(df, price_path)
    return df

def export_boq(df: pd.DataFrame, out_path: Path) -> None:
    if out_path.suffix.lower() == '.xlsx':
        try:
            import openpyxl  # noqa: F401
            df.to_excel(out_path, index=False)
            return
        except Exception as e:
            # Fall back to CSV
            out_path = out_path.with_suffix('.csv')
    df.to_csv(out_path, index=False)
