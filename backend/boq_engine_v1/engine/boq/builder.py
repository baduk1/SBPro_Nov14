from __future__ import annotations

from typing import Dict, Iterable, List

import pandas as pd


def rows_to_dataframe(rows: Iterable[Dict]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(columns=["element_type", "description", "unit", "qty", "code", "source"])
    df = pd.DataFrame(list(rows))
    # sanitize
    df["element_type"] = df["element_type"].fillna("").astype(str)
    df["description"] = df["description"].fillna("").astype(str)
    df["unit"] = df["unit"].fillna("piece").astype(str)
    df["qty"] = pd.to_numeric(df["qty"], errors="coerce").fillna(0.0)
    df["code"] = df["code"].astype("string").replace({pd.NA: None})
    df["source"] = df["source"].astype("string").replace({pd.NA: None})
    return df


def aggregate_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    key_cols = ["element_type", "description", "unit", "code"]
    # Aggregate source as set of unique entries joined by semicolon
    grouped = (
        df.groupby(key_cols, dropna=False)
          .agg(qty=("qty", "sum"),
               source=("source", lambda s: "; ".join(sorted(set([x for x in s.dropna().astype(str) if x])))))
          .reset_index()
    )
    # Round qty based on unit heuristic
    def _round(unit: str, v: float) -> float:
        u = (unit or "").lower()
        if u in ("m", "meter", "metre", "lf"):
            return round(v, 3)
        if u in ("m2", "m²", "sqm", "sf"):
            return round(v, 3)
        if u in ("m3", "m³", "cum", "cf"):
            return round(v, 3)
        # piece/each
        return round(v, 2)
    grouped["qty"] = grouped.apply(lambda r: _round(r["unit"], r["qty"]), axis=1)
    # Sort for stable output
    grouped = grouped.sort_values(key_cols).reset_index(drop=True)
    return grouped
