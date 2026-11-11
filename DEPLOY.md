# Despliegue de una sola imagen React + FastAPI

El `Dockerfile` de la raíz usa una etapa Node para compilar React y una etapa Python para ejecutar FastAPI y servir esos archivos. La imagen final contiene **ambas partes en un solo contenedor** y escucha en el puerto `8000`.

## Coolify con Dockerfile (recomendado)

1. Crea un recurso **Application** conectado a `Brandon161-arch/Telefonos-FastApi`, rama `main`.
2. Selecciona el build pack **Dockerfile**, Dockerfile `/Dockerfile` y base directory `/`.
3. En **Ports Exposes**, configura `8000`.
4. Asigna el dominio al puerto interno `8000`.
5. Añade las variables obligatorias y despliega.
6. En **Persistent Storage**, monta un volumen en `/app/data` para conservar SQLite.

## Variables obligatorias

```env
SECRET_KEY=<clave-aleatoria-larga>
FIRST_ADMIN_EMAIL=<correo-administrador>
FIRST_ADMIN_PASSWORD=<contraseña-segura>
FRONTEND_URL=https://app.tudominio.com
CORS_ORIGINS=https://app.tudominio.com
PORT=8000
```

El Dockerfile activa `SERVE_FRONTEND=true`. React usa una URL relativa para la API, por lo que no requiere `VITE_API_URL`.

Variables opcionales para correo:

```env
SMTP_HOST=<servidor-smtp>
SMTP_PORT=587
SMTP_USER=<usuario-smtp>
SMTP_PASSWORD=<contraseña-de-aplicacion>
SMTP_FROM_EMAIL=<correo-remitente>
SMTP_FROM_NAME=ElectroPhone Store
VERIFICATION_TOKEN_EXPIRE_HOURS=24
```

## Docker Compose

También se puede desplegar como recurso **Docker Compose**: `docker-compose.yml` construye el mismo Dockerfile y ejecuta un servicio `app`. Asigna el dominio al servicio `app`, puerto `8000`; conserva el volumen `backend_data`.

## Comprobaciones

- Tienda React: `https://app.tudominio.com/`
- Salud: `https://app.tudominio.com/health`
- Swagger: `https://app.tudominio.com/docs`

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
