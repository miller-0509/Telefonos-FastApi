from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    logo_url = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    phones = relationship("Phone", back_populates="brand", cascade="all, delete-orphan")


class Phone(Base):
    __tablename__ = "phones"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    model_code = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    # Pricing & Stock
    price = Column(Float, nullable=False)
    discount_price = Column(Float, nullable=True)
    stock = Column(Integer, default=10, nullable=False)

    # Key Specifications
    ram_gb = Column(Integer, nullable=False)       # e.g., 8, 12, 16
    storage_gb = Column(Integer, nullable=False)   # e.g., 128, 256, 512, 1024
    color = Column(String(50), nullable=False)     # e.g., 'Titanio Negro', 'Phantom Black'
    screen_size = Column(Float, nullable=True)     # e.g., 6.7
    screen_type = Column(String(100), nullable=True) # e.g., 'Super Retina XDR OLED 120Hz'
    processor = Column(String(150), nullable=True) # e.g., 'Snapdragon 8 Gen 3', 'A17 Pro'
    battery_mah = Column(Integer, nullable=True)   # e.g., 5000
    main_camera_mp = Column(Integer, nullable=True)# e.g., 200
    front_camera_mp = Column(Integer, nullable=True)# e.g., 12
    os = Column(String(50), nullable=True)         # 'iOS 17', 'Android 14'
    is_5g = Column(Boolean, default=True)

    # Store Display Meta
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    image_url = Column(String(500), nullable=False)
    rating = Column(Float, default=4.8)
    rating_count = Column(Integer, default=12)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    brand = relationship("Brand", back_populates="phones")
    order_items = relationship("OrderItem", back_populates="phone")
    reviews = relationship("Review", back_populates="phone", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    phone_id = Column(Integer, ForeignKey("phones.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name = Column(String(100), nullable=False)
    rating = Column(Integer, nullable=False) # 1 to 5
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    phone = relationship("Phone", back_populates="reviews")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    phone_id = Column(Integer, ForeignKey("phones.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    phone = relationship("Phone")