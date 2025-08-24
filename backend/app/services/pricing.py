from sqlalchemy.orm import Session
from app.models.price_item import PriceItem
from app.models.boq_item import BoqItem


def apply_prices(db: Session, job_id: str, price_list_id: str):
    """
    Map BoQ items to price list by code; leaves unmapped where code is absent.
    """
    items = db.query(BoqItem).filter(BoqItem.job_id == job_id).all()
    price_items = db.query(PriceItem).filter(PriceItem.price_list_id == price_list_id).all()
    price_by_code = {p.code: p for p in price_items}
    for it in items:
        if it.code and it.code in price_by_code:
            it.mapped_price_item_id = price_by_code[it.code].id
    db.commit()
    return items
