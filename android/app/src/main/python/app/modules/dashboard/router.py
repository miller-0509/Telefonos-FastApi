from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.modules.inventario.models import Phone, Brand
from app.modules.ventas.models import Order, OrderItem
from app.modules.login.models import User
from app.modules.login.router import get_current_admin

router = APIRouter(prefix="/admin", tags=["Administración y Métricas"])

@router.get("/metrics")
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Obtener métricas clave de la tienda (Ventas, órdenes, productos, inventario bajo)"""
    total_sales = db.query(func.coalesce(func.sum(Order.total), 0.0)).scalar()
    total_orders = db.query(Order).count()
    total_phones = db.query(Phone).count()
    total_brands = db.query(Brand).count()
    total_users = db.query(User).count()

    # Low stock phones (less than 5 units)
    low_stock_phones = db.query(Phone).filter(Phone.stock <= 5).all()

    # Recent orders
    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(5).all()

    return {
        "total_revenue": round(total_sales, 2),
        "total_orders": total_orders,
        "total_phones": total_phones,
        "total_brands": total_brands,
        "total_users": total_users,
        "low_stock_count": len(low_stock_phones),
        "low_stock_items": [
            {"id": p.id, "name": p.name, "stock": p.stock, "price": p.price}
            for p in low_stock_phones
        ],
        "recent_orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "customer_name": o.customer_name,
                "total": o.total,
                "status": o.status,
                "created_at": o.created_at.isoformat()
            }
            for o in recent_orders
        ]
    }