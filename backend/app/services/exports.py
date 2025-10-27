import csv
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from openpyxl import Workbook
from sqlalchemy.orm import Session

from app.models.boq_item import BoqItem
from app.models.price_item import PriceItem
from app.models.price_list import PriceList
from app.models.job import Job
from app.models.artifact import Artifact
from app.services.storage import artifacts_path


def _collect_rows(db: Session, job_id: str):
    q = db.query(BoqItem).filter(BoqItem.job_id == job_id).all()
    rows = []
    for i in q:
        # Priority 1: Use unit_price if set (from supplier prices)
        rate = float(i.unit_price or 0.0)
        
        # Priority 2: Fallback to admin price list (old system)
        if rate == 0.0 and i.mapped_price_item_id:
            pi = db.query(PriceItem).get(i.mapped_price_item_id)
            if pi:
                rate = float(pi.rate)
        
        rows.append(
            {
                "code": i.code or "",
                "description": i.description,
                "unit": i.unit,
                "qty": float(i.qty),
                "allowance": float(i.allowance_amount or 0.0),
                "rate": rate,
                "amount": rate * float(i.qty) + float(i.allowance_amount or 0.0),
            }
        )
    return rows


def export_csv(db: Session, job_id: str) -> Artifact:
    rows = _collect_rows(db, job_id)
    filename = artifacts_path(job_id, "boq.csv")
    with open(filename, "w", newline="", encoding="utf-8") as f:
        fields = ["code", "description", "unit", "qty", "allowance", "rate", "amount"]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
        total = sum(float(r["amount"]) for r in rows)
        writer.writerow({"code": "", "description": "TOTAL", "unit": "", "qty": "", "allowance": "", "rate": "", "amount": total})
    art = Artifact(job_id=job_id, kind="export:csv", path=filename, size=os.path.getsize(filename))
    db.add(art)
    db.commit()
    db.refresh(art)
    return art


def export_xlsx(db: Session, job_id: str) -> Artifact:
    rows = _collect_rows(db, job_id)
    wb = Workbook()
    ws = wb.active
    ws.title = "BoQ"
    headers = ["code", "description", "unit", "qty", "allowance", "rate", "amount"]
    ws.append(headers)
    for r in rows:
        ws.append([r[h] for h in headers])
    last = ws.max_row
    ws.append(["", "", "", "", "", "TOTAL", f"=SUM(G2:G{last})"])
    filename = artifacts_path(job_id, "boq.xlsx")
    wb.save(filename)
    art = Artifact(job_id=job_id, kind="export:xlsx", path=filename, size=os.path.getsize(filename))
    db.add(art)
    db.commit()
    db.refresh(art)
    return art


def export_pdf(db: Session, job_id: str) -> Artifact:
    rows = _collect_rows(db, job_id)
    filename = artifacts_path(job_id, "boq.pdf")
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    margin = 18 * mm
    y = height - margin

    job = db.query(Job).get(job_id)
    currency = "—"
    if job and job.price_list_id:
        pl = db.query(PriceList).get(job.price_list_id)
        if pl and pl.currency:
            currency = pl.currency

    c.setFont("Helvetica-Bold", 15)
    c.drawString(margin, y, "Bill of Quantities — Priced")
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    c.drawString(margin, y, f"Currency: {currency}")
    y -= 6 * mm

    headers = ["Code", "Description", "Unit", "Qty", "Allowance", "Rate", "Amount"]
    colx = [margin, margin + 28 * mm, margin + 115 * mm, margin + 135 * mm, margin + 152 * mm, margin + 172 * mm, margin + 190 * mm]
    c.setFont("Helvetica-Bold", 10)
    for i, h in enumerate(headers):
        c.drawString(colx[i], y, h)
    y -= 5 * mm
    c.line(margin, y, width - margin, y)
    y -= 4 * mm
    c.setFont("Helvetica", 9)

    def fmt_money(v):
        try:
            return f"{float(v):,.2f}"
        except Exception:
            return str(v)

    total = 0.0
    for r in rows:
        amt = float(r["amount"] or 0.0)
        total += amt
        cells = [
            r["code"] or "",
            (r["description"] or "")[:60],
            r["unit"],
            f"{r['qty']}",
            fmt_money(r["allowance"]),
            fmt_money(r["rate"]),
            fmt_money(amt),
        ]
        if y < margin + 25 * mm:
            c.showPage()
            y = height - margin
            c.setFont("Helvetica", 9)
        for i, t in enumerate(cells):
            c.drawString(colx[i], y, t)
        y -= 5 * mm

    y -= 2 * mm
    c.line(margin, y, width - margin, y)
    y -= 7 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(colx[5], y, "TOTAL:")
    c.drawRightString(width - margin, y, f"{fmt_money(total)} {currency}")
    c.save()
    art = Artifact(job_id=job_id, kind="export:pdf", path=filename, size=os.path.getsize(filename))
    db.add(art)
    db.commit()
    db.refresh(art)
    return art
