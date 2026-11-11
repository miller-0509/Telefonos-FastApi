from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class EscrowRecord(Base):
    """Estado local del escrow on-chain asociado a una orden de compra."""

    __tablename__ = "escrows"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(
        Integer,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    # keccak256(order_number) en hexadecimal (0x + 64 caracteres)
    order_ref = Column(String(66), unique=True, index=True, nullable=False)

    buyer_address = Column(String(42), nullable=False)
    seller_address = Column(String(42), nullable=False)

    # Monto en unidades base del token (USDC = 6 decimales), como string para no perder precisión.
    amount_units = Column(String(78), nullable=False)
    amount_usdc = Column(Float, nullable=False)
    amount_cop = Column(Float, nullable=False)
    cop_per_usdc = Column(Float, nullable=False)

    # pending | funded | released | refunded | failed
    status = Column(String(20), default="pending", nullable=False)
    fund_tx_hash = Column(String(66), nullable=True)
    release_tx_hash = Column(String(66), nullable=True)
    refund_tx_hash = Column(String(66), nullable=True)

    deadline = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("Order")

    @property
    def order_number(self):
        return self.order.order_number if self.order else None
