from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.ventas.schemas import OrderCreate, OrderResponse, OrderStatusUpdate, CouponCreate, CouponResponse, CouponApplyResult
from app.modules.ventas.crud import (
    create_order, get_order, get_order_by_number, get_orders, update_order_status,
    get_coupons, create_coupon, delete_coupon, get_coupon_by_code, validate_coupon
)
from app.modules.login.router import get_current_user_optional, get_current_admin, get_current_user
from app.modules.login.models import User

router = APIRouter(prefix="/orders", tags=["Órdenes y Ventas"])

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def checkout_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Procesar compra de celulares (Checkout con validación de stock y cálculo de totales)"""
    try:
        user_id = current_user.id if current_user else None
        order = create_order(db=db, order_in=order_in, user_id=user_id)
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar la orden: {str(e)}")
@router.get("/track/{order_number}", response_model=OrderResponse)
def track_order(order_number: str, db: Session = Depends(get_db)):
    """Rastrear estado y resumen de una orden mediante su número de seguimiento"""
    order = get_order_by_number(db, order_number=order_number)
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return order

@router.get("/{order_id}", response_model=OrderResponse)
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener el detalle de una orden (el dueño o un administrador)."""
    order = get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver esta orden"
        )
    return order

@router.get("/my-orders", response_model=List[OrderResponse])
def get_user_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener historial de compras del usuario autenticado"""
    return get_orders(db, user_id=current_user.id)

@router.get("", response_model=List[OrderResponse])
def get_all_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Listar todas las órdenes recibidas en la tienda (Solo Administradores)"""
    return get_orders(db, skip=skip, limit=limit)

@router.patch("/{order_id}/status", response_model=OrderResponse)
def change_order_status(
    order_id: int,
    status_in: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Actualizar estado de despacho o pago de una orden (Solo Administradores)"""
    order = get_order(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return update_order_status(db, order=order, status_update=status_in)

# ==================== COUPONS ====================

coupons_router = APIRouter(prefix="/coupons", tags=["Cupones"])

@coupons_router.get("", response_model=List[CouponResponse])
def list_coupons(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Listar todos los cupones (Solo Administradores)"""
    return get_coupons(db, skip=skip, limit=limit)

@coupons_router.post("", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
def create_new_coupon(
    coupon_in: CouponCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Crear un nuevo cupón de descuento (Solo Administradores)"""
    existing = get_coupon_by_code(db, coupon_in.code)
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un cupón con este código")
    if coupon_in.discount_type == "percentage" and coupon_in.discount_value > 100:
        raise HTTPException(status_code=400, detail="El porcentaje no puede superar 100")
    return create_coupon(db, coupon_in=coupon_in)

@coupons_router.delete("/{coupon_id}")
def remove_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Eliminar un cupón (Solo Administradores)"""
    success = delete_coupon(db, coupon_id=coupon_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cupón no encontrado")
    return {"message": "Cupón eliminado correctamente"}

@coupons_router.post("/validate", response_model=CouponApplyResult)
def validate_coupon_endpoint(
    payload: dict,
    db: Session = Depends(get_db)
):
    """Validar un cupón y calcular su descuento sobre un subtotal (público, pre-checkout)."""
    code = payload.get("code")
    subtotal = float(payload.get("subtotal", 0) or 0)
    if not code:
        raise HTTPException(status_code=400, detail="El código del cupón es requerido")
    coupon = get_coupon_by_code(db, code)
    if not coupon:
        raise HTTPException(status_code=400, detail="El cupón ingresado no existe")
    try:
        validate_coupon(db, coupon)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if coupon.discount_type == "percentage":
        discount = round(subtotal * (coupon.discount_value / 100.0), 2)
    else:
        discount = coupon.discount_value
    if discount > subtotal:
        discount = subtotal
    return {"code": coupon.code, "discount_amount": round(discount, 2), "message": "Cupón válido"}