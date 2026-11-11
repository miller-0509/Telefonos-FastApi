from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class BrandBase(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None
    description: Optional[str] = None

class BrandCreate(BrandBase):
    pass

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None

class BrandResponse(BrandBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class PhoneBase(BaseModel):
    brand_id: int
    name: str
    slug: str
    model_code: Optional[str] = None
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    discount_price: Optional[float] = None
    stock: int = Field(default=10, ge=0)
    ram_gb: int
    storage_gb: int
    color: str
    screen_size: Optional[float] = None
    screen_type: Optional[str] = None
    processor: Optional[str] = None
    battery_mah: Optional[int] = None
    main_camera_mp: Optional[int] = None
    front_camera_mp: Optional[int] = None
    os: Optional[str] = None
    is_5g: bool = True
    is_featured: bool = False
    is_active: bool = True
    image_url: str

class PhoneCreate(PhoneBase):
    pass

class PhoneUpdate(BaseModel):
    brand_id: Optional[int] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    model_code: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    discount_price: Optional[float] = None
    stock: Optional[int] = Field(None, ge=0)
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    color: Optional[str] = None
    screen_size: Optional[float] = None
    screen_type: Optional[str] = None
    processor: Optional[str] = None
    battery_mah: Optional[int] = None
    main_camera_mp: Optional[int] = None
    front_camera_mp: Optional[int] = None
    os: Optional[str] = None
    is_5g: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None

class PhoneResponse(PhoneBase):
    id: int
    rating: float
    rating_count: int
    created_at: datetime
    updated_at: datetime
    brand: Optional[BrandResponse] = None

    model_config = ConfigDict(from_attributes=True)

class PhoneFilterParams(BaseModel):
    brand_id: Optional[int] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    is_5g: Optional[bool] = None
    search: Optional[str] = None
    sort_by: Optional[str] = "created_at" # price_asc, price_desc, rating, name


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=3, max_length=2000)

class ReviewResponse(BaseModel):
    id: int
    phone_id: int
    user_id: Optional[int] = None
    user_name: str
    rating: int
    comment: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FavoriteResponse(BaseModel):
    id: int
    phone_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)