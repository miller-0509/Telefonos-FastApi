from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
class OrderItemCreate(BaseModel):
    phone_id: int
    quantity: int = Field(default=1, gt=0)

class OrderItemResponse(BaseModel):
    id: int
    phone_id: Optional[int] = None
    phone_name: str
    phone_color: Optional[str] = None
    phone_storage: Optional[str] = None
    unit_price: float
    quantity: int
    subtotal: float

    model_config = ConfigDict(from_attributes=True)

class OrderCreate(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str
    city: str
    postal_code: Optional[str] = None
    payment_method: str = "credit_card"
    coupon_code: Optional[str] = None
    items: List[OrderItemCreate]

class OrderResponse(BaseModel):
    id: int
    order_number: str
    user_id: Optional[int] = None
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str
    city: str
    postal_code: Optional[str] = None
    subtotal: float
    shipping_cost: float
    tax: float = 0.0
    discount_amount: float
    total: float
    payment_method: str
    payment_status: str
    status: str
    created_at: datetime
    items: List[OrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

class OrderStatusUpdate(BaseModel):
    status: str
    payment_status: Optional[str] = None

class CartItemPayload(BaseModel):
    phone_id: int
    quantity: int

class CartCheckoutValidation(BaseModel):
    items: List[CartItemPayload]


class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percentage"  # 'percentage' o 'fixed'
    discount_value: float = Field(..., gt=0)
    max_uses: int = Field(default=100, ge=0)
    expires_at: Optional[datetime] = None

class CouponUpdate(BaseModel):
    is_active: Optional[bool] = None
    max_uses: Optional[int] = Field(None, ge=0)
    expires_at: Optional[datetime] = None

class CouponResponse(BaseModel):
    id: int
    code: str
    discount_type: str
    discount_value: float
    is_active: bool
    max_uses: int
    used_count: int
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CouponApplyResult(BaseModel):
    code: str
    discount_amount: float
    message: str