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

    # ================= Blockchain / Escrow =================
    # Desactivado por defecto: la app funciona sin nodo ni contratos desplegados.
    BLOCKCHAIN_ENABLED: bool = os.getenv("BLOCKCHAIN_ENABLED", "false").strip().lower() in (
        "1", "true", "yes", "on"
    )
    BLOCKCHAIN_RPC_URL: str = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")
    BLOCKCHAIN_CHAIN_ID: int = int(os.getenv("BLOCKCHAIN_CHAIN_ID", "31337"))
    # Si están vacías, se leen del archivo de despliegue local.
    BLOCKCHAIN_ESCROW_ADDRESS: str = os.getenv("BLOCKCHAIN_ESCROW_ADDRESS", "")
    BLOCKCHAIN_USDC_ADDRESS: str = os.getenv("BLOCKCHAIN_USDC_ADDRESS", "")
    # Cuenta que deposita y libera los fondos (FUNDER_ROLE + ARBITER_ROLE en local).
    BLOCKCHAIN_PRIVATE_KEY: str = os.getenv("BLOCKCHAIN_PRIVATE_KEY", "")
    # Dirección que recibe los pagos; por defecto la cuenta desplegadora.
    BLOCKCHAIN_SELLER_ADDRESS: str = os.getenv("BLOCKCHAIN_SELLER_ADDRESS", "")
    # Conversión usada para pasar el total en COP a unidades de USDC.
    BLOCKCHAIN_COP_PER_USDC: float = float(os.getenv("BLOCKCHAIN_COP_PER_USDC", "4000"))
    BLOCKCHAIN_DEADLINE_DAYS: int = int(os.getenv("BLOCKCHAIN_DEADLINE_DAYS", "14"))
    BLOCKCHAIN_TX_TIMEOUT: int = int(os.getenv("BLOCKCHAIN_TX_TIMEOUT", "120"))
    BLOCKCHAIN_EXPLORER_URL: str = os.getenv("BLOCKCHAIN_EXPLORER_URL", "")
    # Archivo generado por `npm run deploy:local` (relativo a la raíz del proyecto).
    BLOCKCHAIN_DEPLOYMENT_FILE: str = os.getenv(
        "BLOCKCHAIN_DEPLOYMENT_FILE", "blockchain/deployments/localhost.json"
    )

settings = Settings()
