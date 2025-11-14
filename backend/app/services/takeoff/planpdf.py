from __future__ import annotations
from typing import List, Dict, Tuple
from dataclasses import dataclass
import math

# This module extracts coarse quantities from colored plan PDFs used in
# Russian interior sets (монтаж/демонтаж, розетки, душ/ванная elevations).
# Dependencies: pymupdf (fitz), pytesseract, opencv-python-headless, numpy.

@dataclass
class BoqRow:
    code: Optional[str]
    description: str
    unit: str
    qty: float
    source_ref: Optional[str] = None

# --- helpers ---------------------------------------------------------------

def _require_deps():
    try:
        import fitz  # noqa: F401
        import cv2   # noqa: F401
        import numpy # noqa: F401
        import pytesseract  # noqa: F401
    except Exception as e:
        raise RuntimeError("planpdf engine requires pymupdf, opencv-python-headless, numpy, pytesseract") from e

def _rasterize(pdf_path: str, dpi: int = 300) -> list:
    import fitz
    doc = fitz.open(pdf_path)
    images = []
    for i, p in enumerate(doc):
        mat = fitz.Matrix(dpi/72, dpi/72)
        pix = p.get_pixmap(matrix=mat, alpha=False)
        images.append((i, pix))
    # return as numpy arrays (H,W,3)
    import numpy as np
    arrs = []
    for i, pix in images:
        n = np.frombuffer(pix.samples, dtype=np.uint8)
        a = n.reshape(pix.height, pix.width, pix.n)[:, :, :3]
        arrs.append((i, a))
    return arrs

def _ocr_text(image_bgr) -> str:
    import cv2, pytesseract
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    # rus+eng works best for these sheets
    return pytesseract.image_to_string(gray, lang="rus+eng")

def _estimate_mm_per_px(image_bgr, ocr: str) -> float:
    """
    Look for a numeric dimension like 1300 and estimate scale by measuring the
    matching leader line length. As a safe fallback, assume 1 px = 1 mm / 4 (very rough).
    """
    import re, cv2, numpy as np
    nums = [int(n) for n in re.findall(r"\b([1-9][0-9]{2,4})\b", ocr)]
    if not nums:
        return 0.25  # mm/px conservative
    target = max(nums)  # choose a large callout like 1300
    # find long thin arrows/lines via Canny + Hough and pick a top length in px
    edges = cv2.Canny(cv2.GaussianBlur(image_bgr, (3,3), 0), 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180.0, threshold=120, minLineLength=80, maxLineGap=10)
    if lines is None or len(lines) == 0:
        return 0.25
    px_len = max(math.hypot(l[0][0]-l[0][2], l[0][1]-l[0][3]) for l in lines[:300])
    if px_len <= 0:
        return 0.25
    # Assume the largest annotation corresponds-ish to the largest number (heuristic).
    return float(target) / float(px_len)

def _mask_color(image_bgr, which: str):
    """
    Very narrow HSV gates for red/blue annotations used in these drawings.
    which: 'red' or 'blue'
    """
    import cv2, numpy as np
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    if which == "red":
        # red wraps HSV; combine two ranges
        m1 = cv2.inRange(hsv, (0, 70, 50), (10, 255, 255))
        m2 = cv2.inRange(hsv, (170, 70, 50), (180, 255, 255))
        return cv2.bitwise_or(m1, m2)
    if which == "blue":
        return cv2.inRange(hsv, (100, 70, 50), (140, 255, 255))
    raise ValueError("unknown color")

def _skeleton_length_px(mask) -> float:
    """
    Approximate length of colored polylines by thinning to 1px and counting
    edge pixels. Works well for the montage/demolition sheet.
    """
    import cv2, numpy as np
    # thin-ish by erosion until stable
    prev = mask.copy()
    for _ in range(3):
        prev = cv2.erode(prev, np.ones((3,3), np.uint8), iterations=1)
    # count edge pixels
    return float((prev > 0).sum())

def _count_symbols_red(image_bgr) -> int:
    """
    Count red electrical symbols (sockets/switches) by blob detection on red mask.
    """
    import cv2, numpy as np
    mask = _mask_color(image_bgr, "red")
    # remove thin leaders: open
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3,3), np.uint8), iterations=1)
    n, _ = cv2.connectedComponents(mask)
    # subtract background label 0
    return max(0, n - 1)

# --- public ---------------------------------------------------------------

def run_planpdf_takeoff(file_path: str) -> List[Dict]:
    """
    v0 extractor for the specific plan PDFs (монтаж/демонтаж, розетки, ванная/душевая).
    Produces coarse BoQ rows good enough for estimator review in UI.
    """
    _require_deps()
    out: list[BoqRow] = []
    pages = _rasterize(file_path, dpi=350)
    for idx, img in pages:
        text = _ocr_text(img)
        mm_per_px = _estimate_mm_per_px(img, text)
        # Heuristics by filename hints (robust enough for MVP)
        name = file_path.lower()
        if "монтаж" in name or "демонтаж" in name:
            # red = demolition, blue = new (legend on sheet)
            red_len = _skeleton_length_px(_mask_color(img, "red"))
            blu_len = _skeleton_length_px(_mask_color(img, "blue"))
            m_per_px = (mm_per_px / 1000.0)
            out += [
                BoqRow(code="W-DEM", description="Демонтаж перегородок", unit="м", qty=round(red_len * m_per_px, 3), source_ref=f"PDF:p{idx+1}:red"),
                BoqRow(code="W-NEW", description="Монтаж перегородок", unit="м", qty=round(blu_len * m_per_px, 3), source_ref=f"PDF:p{idx+1}:blue"),
            ]
        elif "розет" in name:
            # count red symbols (sockets/switches together for v0)
            cnt = _count_symbols_red(img)
            out.append(BoqRow(code="EL-OUT-1", description="Розетки (общее кол-во)", unit="шт", qty=float(cnt), source_ref=f"PDF:p{idx+1}:red-blobs"))
        elif "ванн" in name or "душ" in name:
            # very coarse: take filled wall regions area via simple threshold → m2
            # (fine-grained per tile type is a v1 addition)
            import cv2, numpy as np
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            thr = cv2.threshold(gray, 230, 255, cv2.THRESH_BINARY_INV)[1]
            px_area = float((thr > 0).sum())
            m2 = (mm_per_px / 1000.0) ** 2 * px_area
            out.append(BoqRow(code="TL-GEN", description="Плиточные поверхности (оценочно)", unit="м2", qty=round(m2, 2), source_ref=f"PDF:p{idx+1}:area"))
        else:
            continue
    # return as list[dict] for BoqItem creation
    return [r.__dict__ for r in out if r.qty and r.qty > 0]