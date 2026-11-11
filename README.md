# 📱 ElectroPhone - Tienda Web Virtual de Celulares con FastAPI

Base completa, moderna y lista para producción de una tienda virtual especializada en venta de teléfonos celulares y smartphones, construida con **FastAPI**, **SQLAlchemy**, **Pydantic v2** y un frontend reactivo con diseño *Glassmorphism*.

---

## 🌟 Características Principales

### 🛒 Frontend & Experiencia de Usuario
- **Catálogo Interactivo**: Filtrado reactivo en tiempo real por **marca** (Apple, Samsung, Xiaomi, Motorola, etc.), **precio máximo con slider en COP ($ 1.000.000 - $ 7.000.000)**, **memoria RAM** (6GB, 8GB, 12GB, 16GB), **almacenamiento** (128GB, 256GB, 512GB) y conectividad **5G**.
- **Búsqueda Instantánea**: Búsqueda por modelo, procesador, color o descripción con debouncing.
- **Carrito de Compras Persistente**: Drawer lateral de compras con almacenamiento en `localStorage`, cálculo automático de subtotal en **Pesos Colombianos (COP)**, envío gratis en pedidos mayores a **$ 1.200.000 COP** y actualización de unidades.
- **Modal de Especificaciones Rápidas**: Visualización de ficha técnica completa (procesador, pantalla OLED, batería mAh, cámaras MP, etc.).
- **Checkout y Generación de Órdenes**: Formulario de compra adaptado a Colombia (PSE, Nequi, Daviplata, tarjetas y contra entrega), validación de stock en tiempo real y código de orden único (`ORD-XXXXXXXX`).
- **Rastreador de Pedidos**: Página dedicada `/track` para consultar el estado en vivo de cualquier orden de compra.

### ⚡ Backend & Arquitectura (FastAPI + SQLAlchemy)
- **Base de Datos SQLite / PostgreSQL**: Integración con SQLAlchemy ORM con inicialización y *seeding* automático del catálogo en el primer arranque.
- **Autenticación y Seguridad JWT**: Hashing seguro de contraseñas con `bcrypt` y tokens JWT para administradores y clientes.
- **Endpoints RESTful Documentados**: Documentación interactiva Swagger UI en `/docs` y ReDoc en `/redoc`.
- **Panel de Administración**: Métricas en tiempo real de facturación, total de órdenes, alertas de stock bajo y formulario para añadir nuevos smartphones al catálogo.
- **Escrow en Blockchain (opcional)**: Contrato `PhoneEscrow` que custodia el pago de cada orden en **USDC** y lo libera al confirmar la entrega o lo reembolsa si hay un problema.

---

## 📁 Estructura del Proyecto

```text
Telefonos-FastApi/
├── app/
│   ├── core/
│   │   ├── config.py          # Configuración del proyecto y variables
│   │   ├── database.py        # Sesiones de SQLAlchemy y conexión
│   │   ├── security.py        # Hashing de passwords y generación de tokens JWT
│   │   └── seed.py            # Catálogo inicial de smartphones y admin por defecto
│   ├── modules/
│   │   ├── login/             # Autenticación, registro y JWT (rama: login)
│   │   ├── inventario/        # Marcas, catálogo de celulares y CRUD (rama: inventario)
│   │   ├── dashboard/         # Panel de administración y métricas (rama: dashboard)
│   │   ├── ventas/            # Órdenes, checkout y rastreo de pedidos (base de main)
│   │   └── blockchain/        # Integración web3.py con el contrato de escrow
│   ├── api/
│   │   └── router.py          # Router maestro que agrega los módulos
│   ├── static/
│   │   ├── css/style.css      # Estilos modernos Dark Glassmorphism
│   │   └── js/app.js          # Lógica interactiva del cliente (carrito, filtros)
│   ├── templates/             # Vistas Jinja2 (base, storefront, track, admin)
│   └── main.py                # Inicialización de FastAPI, montaje estático y lifespans
├── blockchain/                # Contratos Solidity + Hardhat
│   ├── contracts/
│   │   ├── PhoneEscrow.sol    # Escrow en USDC por orden
│   │   └── MockUSDC.sol       # Stablecoin de prueba (6 decimales)
│   ├── scripts/deploy.js      # Despliegue local y minteo de USDC de prueba
│   └── test/                  # Tests de los contratos
├── requirements.txt           # Dependencias de Python
├── run.py                     # Script de arranque rápido
└── README.md
```

---

## 🚀 Cómo Ejecutar el Proyecto

### 1. Configurar el entorno
```bash
cp .env.example .env     # Windows: copy .env.example .env
```

### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3. Iniciar el servidor
```bash
python run.py
```
*O usando uvicorn directamente:*
```bash
uvicorn app.main:app --reload
```

> La base de datos SQLite (`telefonos.db`) se crea automáticamente en el primer arranque, junto con el catálogo inicial y el administrador por defecto.

### 4. Abrir en tu navegador
- 🌐 **Tienda Virtual**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- 📦 **Rastrear Pedido**: [http://127.0.0.1:8000/track](http://127.0.0.1:8000/track)
- ⚙️ **Panel de Administración**: [http://127.0.0.1:8000/admin](http://127.0.0.1:8000/admin)
- ⚡ **Documentación Swagger API**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## ⛓️ Escrow en Blockchain (opcional)

El módulo viene **desactivado por defecto** (`BLOCKCHAIN_ENABLED=false`), por lo que la tienda funciona igual sin nodo ni contratos.

Para probarlo en local:

```bash
# Terminal 1: nodo Hardhat
cd blockchain && npm install && npm run node

# Terminal 2: desplegar MockUSDC + PhoneEscrow
cd blockchain && npm run deploy:local
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

---

## 🔑 Credenciales por Defecto (Admin)

Al iniciar la aplicación por primera vez, se genera automáticamente el usuario administrador y el catálogo inicial de celulares (iPhone 15 Pro Max, Galaxy S24 Ultra, Xiaomi 14 Ultra, Pixel 8 Pro, OnePlus 12, etc.):

- **Email**: `admin@electrophone.com`
- **Contraseña**: `admin123456`

---

## 🌿 Organización por Ramas (Módulos)

El proyecto está organizado en **módulos** dentro de `app/modules/`, y cada módulo tiene su propia rama de trabajo en GitHub:

| Rama | Módulo | Contenido |
|------|--------|-----------|
| `main` | Base + `ventas` | Tienda completa y funcional, órdenes, checkout y rastreo |
| `login` | `app/modules/login/` | Autenticación, registro, login y tokens JWT |
| `inventario` | `app/modules/inventario/` | Marcas y catálogo de celulares (CRUD) |
| `dashboard` | `app/modules/dashboard/` | Panel de administración y métricas |

Cada rama es una copia de `main` con su módulo aislado en su propia carpeta, lista para desarrollarse y mergearse de vuelta a `main`.
