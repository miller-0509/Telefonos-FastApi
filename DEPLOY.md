# Despliegue en Coolify

Este proyecto tiene **backend (FastAPI)** y **frontend (Flutter)** en el mismo repositorio, desplegados como **servicios separados** en Coolify.

## Arquitectura

```
api.tudominio.com   ──►  backend  (FastAPI, puerto 8000)
app.tudominio.com   ──►  frontend (Flutter web, nginx puerto 80)
```

El frontend Flutter se compila con la URL del backend quemada vía build-arg `API_BASE_URL`.

## Opción A: Docker Compose en Coolify

1. En Coolify crea un nuevo recurso tipo **Docker Compose**.
2. Apunta al repositorio y elige la rama `main`.
3. Configura las variables de entorno (o crea el archivo `.env`):

```env
SECRET_KEY=una-clave-segura-larga-y-aleatoria
APP_BASE_URL=https://api.tudominio.com
API_BASE_URL=https://api.tudominio.com/api/v1
CORS_ORIGINS=https://app.tudominio.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu.correo@gmail.com
SMTP_PASSWORD=tu-clave-de-app
SMTP_FROM_EMAIL=tu.correo@gmail.com
SMTP_FROM_NAME=ElectroPhone Store
FIRST_ADMIN_EMAIL=admin@electrophone.com
FIRST_ADMIN_PASSWORD=admin123456
```

4. En **Proxy/Domains**:
   - `backend` → dominio `api.tudominio.com`, puerto `8000`.
   - `frontend` → dominio `app.tudominio.com`, puerto `80`.

## Opción B: Dos recursos "Application"

1. **Recurso 1 (backend)**:
   - Tipo: `Dockerfile`
   - `Dockerfile location`: `/Dockerfile`
   - `Build context`: `/`
   - Variables de entorno: las mismas de arriba (sin `API_BASE_URL`).
   - Domain: `api.tudominio.com` → puerto `8000`.

2. **Recurso 2 (frontend)**:
   - Tipo: `Dockerfile`
   - `Dockerfile location`: `/frontend_flutter/Dockerfile`
   - `Build context`: `/frontend_flutter`
   - Build args: `API_BASE_URL=https://api.tudominio.com/api/v1`
   - Domain: `app.tudominio.com` → puerto `80`.

## Notas importantes

- **CORS**: en producción, pon `CORS_ORIGINS=https://app.tudominio.com` (no `*`).
- **`API_BASE_URL`**: es la URL **pública** del backend. Si cambia, hay que recompilar el frontend.
- **SQLite**: los datos se guardan en un volumen Docker (`backend_data`). Para persistencia real en producción considera migrar a PostgreSQL (solo cambia `DATABASE_URL`).
- **Email**: usa la contraseña de aplicación de Gmail (no tu contraseña normal) si usas Gmail.

## Blockchain / Escrow (opcional)

El módulo de escrow en USDC viene **desactivado por defecto**. Si lo vas a usar en
producción, despliega los contratos en la red elegida y configura:

```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=https://tu-proveedor-rpc
BLOCKCHAIN_CHAIN_ID=137
BLOCKCHAIN_ESCROW_ADDRESS=0x...
BLOCKCHAIN_USDC_ADDRESS=0x...
BLOCKCHAIN_PRIVATE_KEY=0x...   # solo en el gestor de secretos
BLOCKCHAIN_SELLER_ADDRESS=0x...
BLOCKCHAIN_COP_PER_USDC=4000
```

> El archivo `blockchain/deployments/localhost.json` **no** se copia dentro de la
> imagen Docker: en producción define las direcciones con variables de entorno.
> Antes de manejar fondos reales, revisa el checklist de
> [`blockchain/README.md`](blockchain/README.md).

## Construir localmente para probar

```bash
# Backend
docker build -t electrophone-backend .

# Frontend (ajusta la URL del backend)
docker build -t electrophone-frontend \
  --build-arg API_BASE_URL=http://localhost:8000/api/v1 \
  ./frontend_flutter

# Todo junto
docker compose up --build
```
