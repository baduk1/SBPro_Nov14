
from __future__ import annotations
from typing import List, Dict
import pandas as pd
from pathlib import Path

def build_boq(items: List[Dict[str,object]]) -> pd.DataFrame:
    if not items:
        return pd.DataFrame(columns=['code','description','unit','qty','source'])
    df = pd.DataFrame(items)
    grp = df.groupby(['code','description','unit'], as_index=False)['qty'].sum()
    return grp

def join_prices(boq: pd.DataFrame, price_csv_path: Path) -> pd.DataFrame:
    prices = pd.read_csv(price_csv_path)
    prices['code'] = prices['code'].astype(str)
    out = boq.merge(prices, on=['code','unit'], how='left')
    if 'rate' in out.columns:
        out['line_total'] = out['qty'] * out['rate']
    return out
