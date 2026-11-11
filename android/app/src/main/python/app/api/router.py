from fastapi import APIRouter
from app.modules.login.router import router as auth_router
from app.modules.inventario.router import router as inventario_router
from app.modules.ventas.router import router as orders_router
from app.modules.ventas.router import coupons_router
from app.modules.dashboard.router import router as admin_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(inventario_router)
api_router.include_router(orders_router)
api_router.include_router(coupons_router)
api_router.include_router(admin_router)