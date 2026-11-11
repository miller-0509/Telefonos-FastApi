from typing import List, Optional

from sqlalchemy.orm import Session

from app.modules.blockchain.models import EscrowRecord
from app.modules.ventas.models import Order


def get_escrow_by_order_id(db: Session, order_id: int) -> Optional[EscrowRecord]:
    return db.query(EscrowRecord).filter(EscrowRecord.order_id == order_id).first()


def get_escrow_by_order_number(db: Session, order_number: str) -> Optional[EscrowRecord]:
    return (
        db.query(EscrowRecord)
        .join(Order, Order.id == EscrowRecord.order_id)
        .filter(Order.order_number == order_number)
        .first()
    )


def get_escrow_by_ref(db: Session, order_ref: str) -> Optional[EscrowRecord]:
    return db.query(EscrowRecord).filter(EscrowRecord.order_ref == order_ref).first()


def list_escrows(db: Session, skip: int = 0, limit: int = 100) -> List[EscrowRecord]:
    return (
        db.query(EscrowRecord)
        .order_by(EscrowRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def _naive_utc(value):
    if value is None:
        return None
    if getattr(value, "tzinfo", None) is not None:
        return value.replace(tzinfo=None)
    return value


def create_escrow_record(db: Session, order: Order, data: dict) -> EscrowRecord:
    record = EscrowRecord(
        order_id=order.id,
        order_ref=data["order_ref"],
        buyer_address=data["buyer_address"],
        seller_address=data["seller_address"],
        amount_units=str(data["amount_units"]),
        amount_usdc=float(data["amount_usdc"]),
        amount_cop=float(order.total),
        cop_per_usdc=float(data["cop_per_usdc"]),
        status=data.get("status", "funded"),
        fund_tx_hash=data.get("tx_hash"),
        deadline=_naive_utc(data.get("deadline")),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_escrow_record(db: Session, record: EscrowRecord, **fields) -> EscrowRecord:
    for key, value in fields.items():
        if key == "deadline":
            value = _naive_utc(value)
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record
