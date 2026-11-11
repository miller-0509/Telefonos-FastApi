import re
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func
from app.modules.inventario.models import Brand, Phone, Review, Favorite
from app.modules.inventario.schemas import (
    BrandCreate, BrandUpdate, PhoneCreate, PhoneUpdate, ReviewCreate
)

# ==================== BRANDS ====================

def get_brand(db: Session, brand_id: int) -> Optional[Brand]:
    return db.query(Brand).filter(Brand.id == brand_id).first()

def get_brand_by_slug(db: Session, slug: str) -> Optional[Brand]:
    return db.query(Brand).filter(Brand.slug == slug).first()

def get_brands(db: Session, skip: int = 0, limit: int = 100) -> List[Brand]:
    return db.query(Brand).offset(skip).limit(limit).all()

def create_brand(db: Session, brand_in: BrandCreate) -> Brand:
    db_brand = Brand(**brand_in.model_dump())
    db.add(db_brand)
    db.commit()
    db.refresh(db_brand)
    return db_brand

def update_brand(db: Session, db_brand: Brand, brand_in: BrandUpdate) -> Brand:
    update_data = brand_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_brand, field, value)
    db.commit()
    db.refresh(db_brand)
    return db_brand

def delete_brand(db: Session, brand_id: int) -> bool:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if brand:
        db.delete(brand)
        db.commit()
        return True
    return False

# ==================== PHONES ====================

def get_phone(db: Session, phone_id: int) -> Optional[Phone]:
    return db.query(Phone).filter(Phone.id == phone_id).first()

def get_phone_by_slug(db: Session, slug: str) -> Optional[Phone]:
    return db.query(Phone).filter(Phone.slug == slug).first()

def get_phones(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    brand_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    ram_gb: Optional[int] = None,
    storage_gb: Optional[int] = None,
    is_5g: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at"
) -> Tuple[List[Phone], int]:
    query = db.query(Phone).filter(Phone.is_active == True)

    if brand_id:
        query = query.filter(Phone.brand_id == brand_id)
    if min_price is not None:
        query = query.filter(Phone.price >= min_price)
    if max_price is not None:
        query = query.filter(Phone.price <= max_price)
    if ram_gb:
        query = query.filter(Phone.ram_gb == ram_gb)
    if storage_gb:
        query = query.filter(Phone.storage_gb == storage_gb)
    if is_5g is not None:
        query = query.filter(Phone.is_5g == is_5g)
    if is_featured is not None:
        query = query.filter(Phone.is_featured == is_featured)
    if search:
        # Busqueda por tokens: cada palabra debe coincidir en algun campo.
        # Cubre nombre, descripcion, procesador, color, tipo de pantalla, marca
        # y capacidad (RAM/almacenamiento): "256", "256GB", "8 GB", "5G", etc.
        for token in search.strip().split():
            token = token.strip()
            if not token or token.lower() in ("gb", "tb", "ram"):
                continue
            pattern = f"%{token}%"
            conditions = [
                Phone.name.ilike(pattern),
                Phone.description.ilike(pattern),
                Phone.processor.ilike(pattern),
                Phone.color.ilike(pattern),
                Phone.screen_type.ilike(pattern),
                Phone.brand.has(Brand.name.ilike(pattern)),
            ]
            capacity_match = re.fullmatch(r"(\d+)\s*g?b?", token, re.IGNORECASE)
            if capacity_match:
                capacity = int(capacity_match.group(1))
                conditions.append(Phone.storage_gb == capacity)
                conditions.append(Phone.ram_gb == capacity)
            query = query.filter(or_(*conditions))

    total_count = query.count()

    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(asc(Phone.price))
    elif sort_by == "price_desc":
        query = query.order_by(desc(Phone.price))
    elif sort_by == "rating":
        query = query.order_by(desc(Phone.rating))
    elif sort_by == "name":
        query = query.order_by(asc(Phone.name))
    else: # default newest
        query = query.order_by(desc(Phone.created_at))

    items = query.offset(skip).limit(limit).all()
    return items, total_count

def create_phone(db: Session, phone_in: PhoneCreate) -> Phone:
    db_phone = Phone(**phone_in.model_dump())
    db.add(db_phone)
    db.commit()
    db.refresh(db_phone)
    return db_phone

def update_phone(db: Session, db_phone: Phone, phone_in: PhoneUpdate) -> Phone:
    update_data = phone_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_phone, field, value)
    db.commit()
    db.refresh(db_phone)
    return db_phone

def delete_phone(db: Session, phone_id: int) -> bool:
    phone = db.query(Phone).filter(Phone.id == phone_id).first()
    if phone:
        db.delete(phone)
        db.commit()
        return True
    return False

def update_stock(db: Session, phone_id: int, quantity_change: int) -> Optional[Phone]:
    phone = db.query(Phone).filter(Phone.id == phone_id).first()
    if phone:
        phone.stock += quantity_change
        if phone.stock < 0:
            phone.stock = 0
        db.commit()
        db.refresh(phone)
        return phone
    return None

# ==================== REVIEWS ====================

def get_reviews(db: Session, phone_id: int, skip: int = 0, limit: int = 50) -> List[Review]:
    return (
        db.query(Review)
        .filter(Review.phone_id == phone_id)
        .order_by(desc(Review.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_review(
    db: Session,
    phone_id: int,
    review_in: ReviewCreate,
    user_name: str,
    user_id: Optional[int] = None
) -> Review:
    db_review = Review(
        phone_id=phone_id,
        user_id=user_id,
        user_name=user_name,
        rating=review_in.rating,
        comment=review_in.comment.strip()
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    # Recalcular rating promedio y conteo del teléfono
    _recalculate_phone_rating(db, phone_id)
    return db_review

def delete_review(db: Session, review_id: int) -> bool:
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        return False
    phone_id = review.phone_id
    db.delete(review)
    db.commit()
    _recalculate_phone_rating(db, phone_id)
    return True

def _recalculate_phone_rating(db: Session, phone_id: int) -> None:
    phone = db.query(Phone).filter(Phone.id == phone_id).first()
    if not phone:
        return
    avg, count = db.query(
        func.avg(Review.rating),
        func.count(Review.id)
    ).filter(Review.phone_id == phone_id).first()
    phone.rating = round(float(avg), 2) if avg else 4.8
    phone.rating_count = count or 0
    db.commit()
    db.refresh(phone)

# ==================== FAVORITES ====================

def get_favorites(db: Session, user_id: int) -> List[Favorite]:
    return (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc())
        .all()
    )

def get_favorite(db: Session, user_id: int, phone_id: int) -> Optional[Favorite]:
    return db.query(Favorite).filter(Favorite.user_id == user_id, Favorite.phone_id == phone_id).first()

def add_favorite(db: Session, user_id: int, phone_id: int) -> Favorite:
    db_fav = Favorite(user_id=user_id, phone_id=phone_id)
    db.add(db_fav)
    db.commit()
    db.refresh(db_fav)
    return db_fav

def remove_favorite(db: Session, user_id: int, phone_id: int) -> bool:
    fav = get_favorite(db, user_id=user_id, phone_id=phone_id)
    if not fav:
        return False
    db.delete(fav)
    db.commit()
    return True