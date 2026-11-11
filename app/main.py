import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base, get_db, SessionLocal, migrate_sqlite_schema
from app.core.seed import seed_database
from app.core.rate_limit import RateLimitMiddleware
from app.api.router import api_router
from app.modules.inventario.crud import get_brands, get_phones, get_phone_by_slug
from app.modules.ventas.models import Order
from app.modules.inventario.models import Phone, Brand
from app.modules.login.models import User
from app.modules.blockchain.models import EscrowRecord  # noqa: F401 - registra la tabla escrows
from sqlalchemy import func

# Ensure database tables exist and seed initial data
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables & seed data
    Base.metadata.create_all(bind=engine)
    migrate_sqlite_schema()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown logic (if needed)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="""
    🚀 **ElectroPhone API**: Plataforma de comercio electrónico para venta de smartphones y telefonía móvil.
    
    ### Características principales:
    * 📱 **Catálogo de Celulares**: Filtros por marca, RAM, almacenamiento, precio, conectividad 5G y búsqueda por texto.
    * 🛒 **Carrito & Órdenes**: Validación de inventario en tiempo real y cálculo de envíos.
    * 📦 **Rastreo de Envíos**: Seguimiento en vivo de órdenes mediante código de seguimiento.
    * 🔐 **Autenticación JWT**: Registro, inicio de sesión y control de permisos de administrador.
    * ⚙️ **Panel de Administración**: Métricas de ventas, alertas de stock bajo y gestión de productos.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Rate limiting para mitigar fuerza bruta en autenticación
app.add_middleware(RateLimitMiddleware, limit=10, window_seconds=60)

# CORS configuration
_cors_origins = settings.CORS_ORIGINS
if _cors_origins.strip() == "*":
    _allow_origins = ["*"]
else:
    # Limpia espacios y barras finales para que coincidan exactamente con el origen
    _allow_origins = [
        o.strip().rstrip("/")
        for o in _cors_origins.split(",")
        if o.strip()
    ]
_allow_credentials = _allow_origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Log de diagnóstico: muestra qué orígenes CORS se cargaron realmente
print(f"[CORS] Orígenes permitidos: {_allow_origins} | credentials={_allow_credentials}")

# Static files & Templates directory configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, "static")
templates_dir = os.path.join(BASE_DIR, "templates")
frontend_dist_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist"))
frontend_index = os.path.join(frontend_dist_dir, "index.html")
serve_react = settings.SERVE_FRONTEND and os.path.isfile(frontend_index)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
if serve_react and os.path.isdir(os.path.join(frontend_dist_dir, "assets")):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_dist_dir, "assets")),
        name="react-assets"
    )
templates = Jinja2Templates(directory=templates_dir)


def render_page(request: Request, template_name: str, context: dict):
    if serve_react:
        return FileResponse(frontend_index, media_type="text/html")
    return templates.TemplateResponse(
        request=request,
        name=template_name,
        context=context
    )

def format_cop(value):
    """Formatea valores numéricos a pesos colombianos COP ($ 5.499.900)"""
    if value is None:
        return "$0"
    try:
        val_int = int(round(float(value)))
        return f"${val_int:,}".replace(",", ".")
    except (ValueError, TypeError):
        return f"${value}"

templates.env.filters["cop"] = format_cop

@app.get("/health", tags=["Sistema"])
def health_check():
    """Endpoint de salud para el balanceador/proxy (Coolify health check)."""
    return {"status": "ok"}

# Register Master API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# ================= Frontend Template Routes =================
@app.get("/", tags=["Frontend"])
def render_storefront(request: Request, db: Session = Depends(get_db)):
    """Página principal de la tienda con catálogo interactivo y filtros"""
    if serve_react:
        return FileResponse(frontend_index, media_type="text/html")
    brands = get_brands(db)
    return render_page(request, "index.html", {"brands": brands})

@app.get("/track", tags=["Frontend"])
def render_tracking_page(request: Request):
    """Página de consulta y rastreo de órdenes de compra"""
    return render_page(request, "track.html", {})

@app.get("/login", tags=["Frontend"])
def render_login_page(request: Request):
    """Página de inicio de sesión y registro de clientes"""
    return render_page(request, "login.html", {})

@app.get("/verify-email", tags=["Frontend"])
def render_verify_email_page(request: Request, token: str = ""):
    """Página que procesa el token de verificación de correo"""
    if serve_react:
        return FileResponse(frontend_index, media_type="text/html")
    return render_page(request, "verify_email.html", {"token": token})

@app.get("/account", tags=["Frontend"])
def render_account_page(request: Request):
    """Página de mi cuenta (perfil y órdenes del cliente autenticado)"""
    return render_page(request, "account.html", {})

@app.get("/phone/{slug}", tags=["Frontend"])
def render_phone_detail_page(slug: str, request: Request, db: Session = Depends(get_db)):
    """Página de detalle de un teléfono por slug (con especificaciones y reseñas)"""
    if serve_react:
        return FileResponse(frontend_index, media_type="text/html")
    phone = get_phone_by_slug(db, slug=slug)
    if not phone:
        from fastapi.responses import RedirectResponse
        return RedirectResponse("/", status_code=302)
    return render_page(request, "phone_detail.html", {"phone": phone})

@app.get("/admin", tags=["Frontend"], include_in_schema=False)
def redirect_legacy_admin():
    """Enviar el acceso del panel al frontend React, que protege la ruta."""
    if serve_react:
        return FileResponse(frontend_index, media_type="text/html")
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/admin",
        status_code=307
    )


if serve_react:
    @app.get("/{frontend_path:path}", include_in_schema=False)
    def react_spa_fallback(frontend_path: str):
        """Devolver React para rutas de BrowserRouter no conocidas por FastAPI."""
        requested_path = os.path.abspath(os.path.join(frontend_dist_dir, frontend_path))
        if requested_path.startswith(frontend_dist_dir + os.sep) and os.path.isfile(requested_path):
            return FileResponse(requested_path)
        return FileResponse(frontend_index, media_type="text/html")
