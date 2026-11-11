from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.inventario.schemas import (
    BrandResponse, BrandCreate, BrandUpdate,
    PhoneResponse, PhoneCreate, PhoneUpdate,
    ReviewCreate, ReviewResponse, FavoriteResponse
)
from app.modules.inventario.crud import (
    get_brands, get_brand, get_brand_by_slug, create_brand, update_brand, delete_brand,
    get_phones, get_phone, get_phone_by_slug, create_phone, update_phone, delete_phone,
    get_reviews, create_review, delete_review,
    get_favorites, get_favorite, add_favorite, remove_favorite
)
from app.modules.login.router import get_current_admin, get_current_user_optional, get_current_user
from app.modules.login.models import User

router = APIRouter()

# ==================== BRANDS ====================

brands_router = APIRouter(prefix="/brands", tags=["Marcas"])

@brands_router.get("", response_model=List[BrandResponse])
def read_brands(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Listar todas las marcas de celulares"""
    return get_brands(db, skip=skip, limit=limit)

@brands_router.get("/{brand_id}", response_model=BrandResponse)
def read_brand(brand_id: int, db: Session = Depends(get_db)):
    """Obtener detalle de una marca por ID"""
    brand = get_brand(db, brand_id=brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    return brand

@brands_router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_new_brand(
    brand_in: BrandCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Crear nueva marca (Solo Administradores)"""
    existing = get_brand_by_slug(db, slug=brand_in.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una marca con este identificador (slug)")
    return create_brand(db, brand_in=brand_in)

@brands_router.put("/{brand_id}", response_model=BrandResponse)
def update_existing_brand(
    brand_id: int,
    brand_in: BrandUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Actualizar marca (Solo Administradores)"""
    brand = get_brand(db, brand_id=brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    return update_brand(db, db_brand=brand, brand_in=brand_in)

@brands_router.delete("/{brand_id}")
def delete_existing_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Eliminar marca (Solo Administradores)"""
    success = delete_brand(db, brand_id=brand_id)
    if not success:
        raise HTTPException(status_code=404, detail="Marca no encontrada")
    return {"message": "Marca eliminada correctamente"}

# ==================== PHONES ====================

phones_router = APIRouter(prefix="/phones", tags=["Celulares"])

@phones_router.get("", response_model=dict)
def list_phones(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    brand_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    ram_gb: Optional[int] = None,
    storage_gb: Optional[int] = None,
    is_5g: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    db: Session = Depends(get_db)
):
    """Listar teléfonos celulares con filtros avanzados, búsqueda y paginación"""
    items, total = get_phones(
        db=db,
        skip=skip,
        limit=limit,
        brand_id=brand_id,
        min_price=min_price,
        max_price=max_price,
        ram_gb=ram_gb,
        storage_gb=storage_gb,
        is_5g=is_5g,
        is_featured=is_featured,
        search=search,
        sort_by=sort_by
    )

    # Format items to Pydantic responses
    items_data = [PhoneResponse.model_validate(p) for p in items]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": items_data
    }

@phones_router.get("/featured", response_model=List[PhoneResponse])
def get_featured_phones(db: Session = Depends(get_db)):
    """Obtener celulares destacados para el escaparate principal"""
    items, _ = get_phones(db=db, limit=8, is_featured=True)
    return items

@phones_router.get("/{phone_id_or_slug}", response_model=PhoneResponse)
def get_single_phone(phone_id_or_slug: str, db: Session = Depends(get_db)):
    """Obtener detalle de un teléfono por su ID o por su slug SEO friendly"""
    if phone_id_or_slug.isdigit():
        phone = get_phone(db, phone_id=int(phone_id_or_slug))
    else:
        phone = get_phone_by_slug(db, slug=phone_id_or_slug)

    if not phone:
        raise HTTPException(status_code=404, detail="Teléfono no encontrado")
    return phone

@phones_router.post("", response_model=PhoneResponse, status_code=status.HTTP_201_CREATED)
def create_new_phone(
    phone_in: PhoneCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Crear nuevo teléfono celular (Solo Administradores)"""
    existing = get_phone_by_slug(db, slug=phone_in.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un teléfono con este slug identificador")
    return create_phone(db, phone_in=phone_in)

@phones_router.put("/{phone_id}", response_model=PhoneResponse)
def update_existing_phone(
    phone_id: int,
    phone_in: PhoneUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Actualizar especificaciones, precio o stock de teléfono (Solo Administradores)"""
    phone = get_phone(db, phone_id=phone_id)
    if not phone:
        raise HTTPException(status_code=404, detail="Teléfono no encontrado")
    return update_phone(db, db_phone=phone, phone_in=phone_in)

@phones_router.delete("/{phone_id}")
def delete_existing_phone(
    phone_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Eliminar teléfono celular del catálogo (Solo Administradores)"""
    success = delete_phone(db, phone_id=phone_id)
    if not success:
        raise HTTPException(status_code=404, detail="Teléfono no encontrado")
    return {"message": "Teléfono eliminado del catálogo exitosamente"}

router.include_router(brands_router)
router.include_router(phones_router)

# ==================== REVIEWS ====================

reviews_router = APIRouter(prefix="/phones/{phone_id}/reviews", tags=["Reseñas"])

@reviews_router.get("", response_model=dict)
def list_reviews(
    phone_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Listar reseñas y calificaciones de un teléfono"""
    phone = get_phone(db, phone_id=phone_id)
    if not phone:
        raise HTTPException(status_code=404, detail="Teléfono no encontrado")
    reviews = get_reviews(db, phone_id=phone_id, skip=skip, limit=limit)
    return {
        "total": len(reviews),
        "rating": phone.rating,
        "rating_count": phone.rating_count,
        "data": [ReviewResponse.model_validate(r) for r in reviews]
    }

@reviews_router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def add_review(
    phone_id: int,
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Publicar una reseña sobre un teléfono (requiere cuenta verificada)"""
    phone = get_phone(db, phone_id=phone_id)
    if not phone:
        raise HTTPException(status_code=404, detail="Teléfono no encontrado")
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Debes iniciar sesión para dejar una reseña"
        )
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes verificar tu cuenta por correo antes de dejar una reseña"
        )
    return create_review(
        db, phone_id=phone_id, review_in=review_in,
        user_name=current_user.full_name, user_id=current_user.id
    )

reviews_admin_router = APIRouter(prefix="/reviews", tags=["Reseñas"])

@reviews_admin_router.delete("/{review_id}")
def remove_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Eliminar una reseña (Solo Administradores)"""
    success = delete_review(db, review_id=review_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")
    return {"message": "Reseña eliminada correctamente"}

router.include_router(reviews_router)
router.include_router(reviews_admin_router)

# ==================== FAVORITES ====================

favorites_router = APIRouter(prefix="/favorites", tags=["Favoritos"])

@favorites_router.get("", response_model=List[PhoneResponse])
def list_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar los celulares favoritos del usuario autenticado."""
    favorites = get_favorites(db, user_id=current_user.id)
    phones = [f.phone for f in favorites if f.phone is not None]
    return phones

@favorites_router.post("/{phone_id}", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
def add_to_favorites(
    phone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Agregar un celular a favoritos."""
    phone = get_phone(db, phone_id=phone_id)
    if not phone:
        raise HTTPException(status_code=404, detail="Teléfono no encontrado")
    existing = get_favorite(db, user_id=current_user.id, phone_id=phone_id)
    if existing:
        raise HTTPException(status_code=400, detail="Este teléfono ya está en tus favoritos")
    return add_favorite(db, user_id=current_user.id, phone_id=phone_id)

@favorites_router.delete("/{phone_id}")
def remove_from_favorites(
    phone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Quitar un celular de favoritos."""
    success = remove_favorite(db, user_id=current_user.id, phone_id=phone_id)
    if not success:
        raise HTTPException(status_code=404, detail="El teléfono no está en tus favoritos")
    return {"message": "Eliminado de favoritos"}

router.include_router(favorites_router)