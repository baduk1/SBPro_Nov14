
# Optional: use OpenAI to guess a category for unknown layers or block names.
# Usage: set OPENAI_API_KEY, then call guess_category('ELEC-LTNG-OUTLET').
import os
from typing import Optional

def guess_category(name: str) -> Optional[str]:
    try:
        from openai import OpenAI
        client = OpenAI()
        sys = "You map CAD layer or block names to a coarse category: pipe, cable, outlet, switch, light, sink, wc, valve, board, other."
        prompt = f"Name: {name}\nReturn just one category token."
        resp = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role":"system","content":sys},{"role":"user","content":prompt}], temperature=0)
        return resp.choices[0].message.content.strip().lower()
    except Exception:
        return None
