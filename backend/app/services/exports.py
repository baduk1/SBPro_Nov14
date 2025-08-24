import csv
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from openpyxl import Workbook
from sqlalchemy.orm import Session

from app.models.boq_item import BoqItem
from app.models.price_item import PriceItem
from app.models.artifact import Artifact
from app.services.storage import artifacts_path


def _collect_rows(db: Session, job_id: str):
    q = db.query(BoqItem).filter(BoqItem.job_id == job_id).all()
    rows = []
    for i in q:
        rate = 0.0
        if i.mapped_price_item_id:
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
    y = height - 40
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Bill of Quantities")
    y -= 25
    c.setFont("Helvetica", 10)
    headers = ["Code", "Description", "Unit", "Qty", "Allowance", "Rate", "Amount"]
    c.drawString(40, y, " | ".join(headers))
    y -= 18
    for r in rows:
        line = f"{r['code']} | {r['description'][:40]} | {r['unit']} | {r['qty']} | {r['allowance']} | {r['rate']} | {r['amount']}"
        if y < 60:
            c.showPage()
            y = height - 40
        c.drawString(40, y, line)
        y -= 14
    c.save()
    art = Artifact(job_id=job_id, kind="export:pdf", path=filename, size=os.path.getsize(filename))
    db.add(art)
    db.commit()
    db.refresh(art)
    return art
