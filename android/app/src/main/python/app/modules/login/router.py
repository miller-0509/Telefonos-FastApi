from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.modules.login.schemas import (
    UserCreate, UserResponse, Token, UserLogin,
    VerifyEmailResponse, ResendVerificationRequest,
    UserUpdate, UserDeleteResponse
)
from app.modules.login.crud import (
    get_user_by_email, create_user, authenticate_user, get_user,
    get_user_by_verification_token, mark_user_verified, regenerate_verification_token,
    update_user, delete_user
)
from app.modules.login.models import User
from app.modules.login.emails import send_verification_email

router = APIRouter(prefix="/auth", tags=["Autenticación"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token", auto_error=False)

def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        return None

    user = get_user(db, user_id=user_id)
    return user

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales de acceso",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = get_user(db, user_id=user_id)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador para realizar esta acción"
        )
    return current_user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registra un usuario y envía el correo de verificación de cuenta."""
    existing = get_user_by_email(db, email=user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con este correo electrónico"
        )
    user = create_user(db, user_in=user_in)
    send_verification_email(to_email=user.email, user_name=user.full_name, token=user.verification_token)
    return user

@router.post("/login", response_model=Token)
def login_json(credentials: UserLogin, db: Session = Depends(get_db)):
    """Inicia sesión. Exige que la cuenta esté verificada por correo."""
    user = authenticate_user(db, email=credentials.email, password=credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos"
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta no está verificada. Revisa tu correo electrónico para confirmar tu cuenta."
        )
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/token", response_model=Token)
def login_oauth2(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos"
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta no está verificada. Revisa tu correo electrónico para confirmar tu cuenta."
        )
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/verify-email", response_model=VerifyEmailResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    """Confirma la cuenta usando el token enviado por correo."""
    user = get_user_by_verification_token(db, token=token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de verificación no es válido o ya fue utilizado."
        )
    if user.is_verified:
        return {"message": "Tu cuenta ya estaba verificada. Podés iniciar sesión.", "email": user.email}
    if user.verification_token_expires and user.verification_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de verificación ha expirado. Solicita uno nuevo."
        )
    mark_user_verified(db, user=user)
    return {"message": "¡Cuenta verificada con éxito! Ya podés iniciar sesión.", "email": user.email}

@router.post("/resend-verification", response_model=VerifyEmailResponse)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Reenvía el correo de verificación a una cuenta no verificada."""
    user = get_user_by_email(db, email=payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe una cuenta registrada con este correo electrónico."
        )
    if user.is_verified:
        return {"message": "Tu cuenta ya está verificada. Podés iniciar sesión.", "email": user.email}
    user = regenerate_verification_token(db, user=user)
    send_verification_email(to_email=user.email, user_name=user.full_name, token=user.verification_token)
    return {"message": "Te enviamos un nuevo enlace de verificación a tu correo.", "email": user.email}

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza el nombre, teléfono y dirección del usuario autenticado."""
    return update_user(db, user=current_user, user_in=user_in)

@router.delete("/me", response_model=UserDeleteResponse)
def delete_own_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina la cuenta del usuario autenticado."""
    delete_user(db, user=current_user)
    return {"message": "Tu cuenta fue eliminada correctamente."}