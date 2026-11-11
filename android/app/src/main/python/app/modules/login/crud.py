from datetime import datetime, timedelta
from typing import Optional, List
import secrets
from sqlalchemy.orm import Session
from app.modules.login.models import User
from app.modules.login.schemas import UserCreate, UserUpdate
from app.core.config import settings
from app.core.security import get_password_hash, verify_password

def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower()).first()

def get_user_by_verification_token(db: Session, token: str) -> Optional[User]:
    return db.query(User).filter(User.verification_token == token).first()

def create_user(db: Session, user_in: UserCreate, is_admin: bool = False) -> User:
    db_user = User(
        full_name=user_in.full_name,
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        phone_number=user_in.phone_number,
        address=user_in.address,
        is_admin=is_admin,
        is_verified=False,
        verification_token=secrets.token_urlsafe(48),
        verification_token_expires=datetime.utcnow() + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def mark_user_verified(db: Session, user: User) -> User:
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    db.refresh(user)
    return user

def regenerate_verification_token(db: Session, user: User) -> User:
    user.verification_token = secrets.token_urlsafe(48)
    user.verification_token_expires = datetime.utcnow() + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user: User, user_in: UserUpdate) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()