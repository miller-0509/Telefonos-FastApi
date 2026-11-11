import os
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env (si existe)
load_dotenv()

class Settings:
    PROJECT_NAME: str = "ElectroPhone Store"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Secret Key for JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production-telefonos-fastapi-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./telefonos.db")
    
    # Admin defaults
    FIRST_ADMIN_EMAIL: str = os.getenv("FIRST_ADMIN_EMAIL", "admin@electrophone.com")
    FIRST_ADMIN_PASSWORD: str = os.getenv("FIRST_ADMIN_PASSWORD", "admin123456")

    # Email / SMTP para verificación por correo
    # Si SMTP_HOST está vacío, el correo se "envía" por consola (modo dev)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "no-reply@electrophone.com")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "ElectroPhone Store")
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_HOURS", "24"))
    # URL pública de la app para construir el enlace de verificación
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://127.0.0.1:8000")

    # CORS: orígenes permitidos (separados por coma). "*" para permitir todos (solo desarrollo)
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

settings = Settings()
