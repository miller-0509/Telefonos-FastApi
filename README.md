# ElectroPhone — FastAPI + React

Tienda local de smartphones con API REST en FastAPI, SQLAlchemy y frontend React/Vite. React es la interfaz web principal; el frontend y la API se ejecutan por separado durante el desarrollo.

## Requisitos

- Python 3.12 o superior
- Node.js 20 o superior y npm

## Ejecutar en local

### 1. Preparar el backend (PowerShell)

Desde la raíz del repositorio:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Si ya tienes un `.env`, no lo sobrescribas. La aplicación carga la configuración desde el `.env` de la raíz. SQLite crea `telefonos.db` en esa misma raíz al iniciar.

### 2. Arrancar FastAPI

En una primera terminal, desde la raíz:

```powershell
python run.py
```

La API queda en `http://127.0.0.1:8000`; documentación: `http://127.0.0.1:8000/docs`.

### 3. Arrancar React

En una segunda terminal:

```powershell
cd frontend
# Si npm no está en PATH pero Node está en la ubicación habitual:
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm ci
npm run dev
```

Abre **http://localhost:5173**. Vite reenvía las solicitudes `/api` a FastAPI en el puerto 8000.

### Cuenta local

Si la base local es nueva, se crea un administrador para desarrollo con el correo y contraseña definidos por `FIRST_ADMIN_EMAIL` y `FIRST_ADMIN_PASSWORD` en `.env`. Los valores de ejemplo son únicamente para desarrollo; cámbialos antes de exponer el sistema.

Sin SMTP, el backend imprime en su terminal los enlaces de verificación. `FRONTEND_URL` debe apuntar a React para que esos enlaces abran la página correcta.

## Funciones incluidas

- Catálogo, filtros, búsqueda, detalle y reseñas.
- Registro, acceso JWT, verificación de correo y perfil.
- Carrito local, validación de cupones y creación/rastreo de pedidos.
- Panel de administración de métricas, inventario, órdenes y cupones.
- Escrow en blockchain opcional: custodia el pago de una orden en USDC y lo libera o reembolsa.

**Pagos:** el checkout local es una demo. No existe integración con PSE, Nequi, tarjetas ni otro proveedor; los pedidos quedan con pago pendiente y no se realiza ningún cobro. El escrow en USDC es un módulo independiente y opcional.

## Escrow en Blockchain (opcional)

El módulo viene **desactivado por defecto** (`BLOCKCHAIN_ENABLED=false`), por lo que la tienda funciona igual sin nodo ni contratos.

Para probarlo en local:

```powershell
# Terminal 1: nodo Hardhat
cd blockchain
npm install
npm run node

# Terminal 2: desplegar MockUSDC + PhoneEscrow
cd blockchain
npm run deploy:local
```

Luego añade a tu `.env`:

```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
BLOCKCHAIN_COP_PER_USDC=4000
```

> La clave anterior es la cuenta #0 de Hardhat: **solo para desarrollo local**.

Los endpoints quedan documentados en Swagger bajo **Blockchain / Escrow**. La guía completa (roles del contrato, API, tests y checklist de producción) está en [`blockchain/README.md`](blockchain/README.md).

## Pruebas

Desde la raíz, con las dependencias del backend instaladas:

```powershell
python -m pytest -q
```

Compilar React:

```powershell
cd frontend
npm run build
```

Probar los contratos:

```powershell
cd blockchain
npm test
```

## Docker Compose

El Dockerfile raíz compila React y lo incluye en la misma imagen que FastAPI. Para probar esa imagen localmente, con Docker instalado y `.env` preparado:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

La tienda React y la API quedan juntas en `http://localhost:8000`; la documentación de FastAPI está en `http://localhost:8000/docs`.

## Estructura relevante

```text
app/                 FastAPI, modelos, servicios y rutas
frontend/            React, Vite y cliente HTTP
frontend_flutter/    Cliente Flutter heredado
android/             Aplicación Android heredada
blockchain/          Contratos Solidity, tests y despliegue Hardhat
tests/               Pruebas del backend
```
