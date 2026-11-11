from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.modules.blockchain import crud, service
from app.modules.blockchain.models import EscrowRecord
from app.modules.blockchain.schemas import (
    BlockchainStatusResponse,
    EscrowCreate,
    EscrowDetailResponse,
    EscrowResponse,
    EscrowTxResponse,
)
from app.modules.login.models import User
from app.modules.login.router import get_current_admin, get_current_user
from app.modules.ventas.crud import get_order_by_number

router = APIRouter(prefix="/blockchain", tags=["Blockchain / Escrow"])

FINAL_STATES = {"funded", "released", "refunded"}


def _chain_http_error(exc: service.BlockchainError) -> HTTPException:
    if isinstance(exc, (service.BlockchainDisabled, service.BlockchainNotConfigured)):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


def _get_record_or_404(db: Session, order_number: str) -> EscrowRecord:
    record = crud.get_escrow_by_order_number(db, order_number)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe un escrow para esta orden",
        )
    return record


def _release(db: Session, record: EscrowRecord) -> EscrowTxResponse:
    try:
        data = service.release_escrow(record.order_ref)
    except service.BlockchainError as exc:
        raise _chain_http_error(exc) from exc

    record = crud.update_escrow_record(
        db,
        record,
        status="released",
        release_tx_hash=data["tx_hash"],
        error=None,
    )
    if record.order:
        record.order.status = "delivered"
        record.order.payment_status = "completed"
        db.commit()
        db.refresh(record)

    return EscrowTxResponse(
        order_number=record.order_number or "",
        status=record.status,
        tx_hash=data["tx_hash"],
        block_number=data.get("block_number"),
        escrow=EscrowResponse.model_validate(record),
    )


def _refund(db: Session, record: EscrowRecord) -> EscrowTxResponse:
    try:
        data = service.refund_escrow(record.order_ref)
    except service.BlockchainError as exc:
        raise _chain_http_error(exc) from exc

    record = crud.update_escrow_record(
        db,
        record,
        status="refunded",
        refund_tx_hash=data["tx_hash"],
        error=None,
    )
    if record.order:
        record.order.status = "cancelled"
        record.order.payment_status = "refunded"
        db.commit()
        db.refresh(record)

    return EscrowTxResponse(
        order_number=record.order_number or "",
        status=record.status,
        tx_hash=data["tx_hash"],
        block_number=data.get("block_number"),
        escrow=EscrowResponse.model_validate(record),
    )


@router.get("/status", response_model=BlockchainStatusResponse)
def blockchain_status():
    """Estado de la conexión con el nodo y de los contratos configurados."""
    try:
        return service.get_status()
    except service.BlockchainError as exc:
        raise _chain_http_error(exc) from exc


@router.get("/escrows", response_model=List[EscrowResponse])
def list_escrows(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Lista los escrows registrados (Solo Administradores)."""
    return crud.list_escrows(db, skip=skip, limit=limit)


@router.get("/escrows/{order_number}", response_model=EscrowDetailResponse)
def get_escrow_detail(order_number: str, db: Session = Depends(get_db)):
    """Consulta el escrow de una orden y, si la cadena está disponible, su estado on-chain."""
    record = _get_record_or_404(db, order_number)
    detail = EscrowDetailResponse.model_validate(record)

    if settings.BLOCKCHAIN_ENABLED:
        try:
            detail.onchain = service.get_escrow(record.order_ref)
        except service.BlockchainError as exc:
            detail.onchain_error = str(exc)

    return detail


@router.post(
    "/escrows", response_model=EscrowResponse, status_code=status.HTTP_201_CREATED
)
def create_escrow(
    payload: EscrowCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Deposita en custodia el total de una orden en USDC (Solo Administradores)."""
    order = get_order_by_number(db, order_number=payload.order_number)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada"
        )

    existing = crud.get_escrow_by_order_id(db, order.id)
    if existing and existing.status in FINAL_STATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La orden ya tiene un escrow en estado '{existing.status}'",
        )

    try:
        data = service.create_escrow(
            order_number=order.order_number,
            buyer_address=payload.buyer_address,
            amount_cop=float(order.total),
            seller_address=payload.seller_address,
            cop_per_usdc=payload.cop_per_usdc,
            deadline_days=payload.deadline_days,
        )
    except service.BlockchainError as exc:
        raise _chain_http_error(exc) from exc

    if existing:
        return crud.update_escrow_record(
            db,
            existing,
            order_ref=data["order_ref"],
            buyer_address=data["buyer_address"],
            seller_address=data["seller_address"],
            amount_units=str(data["amount_units"]),
            amount_usdc=float(data["amount_usdc"]),
            amount_cop=float(order.total),
            cop_per_usdc=float(data["cop_per_usdc"]),
            status=data.get("status", "funded"),
            fund_tx_hash=data.get("tx_hash"),
            deadline=data.get("deadline"),
            error=None,
        )

    return crud.create_escrow_record(db, order=order, data=data)


@router.post("/escrows/{order_number}/confirm", response_model=EscrowTxResponse)
def confirm_delivery(
    order_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El cliente confirma la entrega y se liberan los fondos al vendedor."""
    record = _get_record_or_404(db, order_number)
    if record.status != "funded":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El escrow no está financiado (estado: {record.status})",
        )

    order = record.order
    is_owner = order is not None and order.user_id == current_user.id
    if not current_user.is_admin and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para confirmar esta orden",
        )

    return _release(db, record)


@router.post("/escrows/{order_number}/release", response_model=EscrowTxResponse)
def release_escrow(
    order_number: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Libera los fondos al vendedor (Solo Administradores)."""
    record = _get_record_or_404(db, order_number)
    if record.status != "funded":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El escrow no está financiado (estado: {record.status})",
        )
    return _release(db, record)


@router.post("/escrows/{order_number}/refund", response_model=EscrowTxResponse)
def refund_escrow(
    order_number: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Reembolsa los fondos al comprador (Solo Administradores)."""
    record = _get_record_or_404(db, order_number)
    if record.status != "funded":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El escrow no está financiado (estado: {record.status})",
        )
    return _refund(db, record)


@router.post("/escrows/{order_number}/sync", response_model=EscrowDetailResponse)
def sync_escrow(
    order_number: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Sincroniza el estado local con el estado real del contrato (Solo Administradores)."""
    record = _get_record_or_404(db, order_number)

    try:
        onchain = service.get_escrow(record.order_ref)
    except service.BlockchainError as exc:
        raise _chain_http_error(exc) from exc

    record = crud.update_escrow_record(
        db, record, status=onchain["status"], error=None
    )

    if record.order:
        if onchain["status"] == "released":
            record.order.status = "delivered"
            record.order.payment_status = "completed"
        elif onchain["status"] == "refunded":
            record.order.status = "cancelled"
            record.order.payment_status = "refunded"
        db.commit()
        db.refresh(record)

    detail = EscrowDetailResponse.model_validate(record)
    detail.onchain = onchain
    return detail
