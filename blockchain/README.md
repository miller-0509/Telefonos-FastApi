# ⛓️ Escrow USDC — ElectroPhone

Contrato inteligente que custodia el pago de una orden en **USDC (ERC-20)** hasta
que el cliente confirma la entrega. Si hay un problema, el dinero se reembolsa.

```
Cliente paga (COP/fiat) ──► Backend deposita USDC en PhoneEscrow
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
        Cliente confirma entrega                Reembolso / disputa
        (o admin libera)                        (vendedor, árbitro o
                    │                            cliente tras deadline)
                    ▼                                   ▼
             USDC al vendedor                    USDC al comprador
```

## Contratos

| Archivo | Descripción |
|---------|-------------|
| `contracts/PhoneEscrow.sol` | Custodia, liberación y reembolso de USDC por orden. |
| `contracts/MockUSDC.sol` | USDC de prueba con 6 decimales para desarrollo local. |

### Roles

- **FUNDER_ROLE**: puede depositar fondos (`fundEscrow`). En local lo tiene la cuenta que despliega.
- **ARBITER_ROLE**: puede liberar o reembolsar en cualquier momento. En local también la cuenta que despliega.
- **Comprador**: puede liberar (confirmar entrega) y, pasado el `deadline`, reclamar el reembolso.
- **Vendedor**: puede reembolsar voluntariamente.

Cada orden se identifica por `orderRef = keccak256(order_number)` (por ejemplo
`keccak256("ORD-ABCD1234")`). Los montos usan 6 decimales (`1 USDC = 1_000_000`).

## Requisitos

- Node.js 18+ y npm
- Python 3.11+ con las dependencias del proyecto (`pip install -r requirements.txt`)

## Puesta en marcha local

### 1. Instalar dependencias de los contratos

```bash
cd blockchain
npm install
```

### 2. Levantar el nodo local (terminal 1)

```bash
npm run node
```

Hardhat muestra 20 cuentas de prueba. La **cuenta #0** se usa para el fondo de escrow:

```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

> ⚠️ Esas claves son públicas y solo sirven en local. Nunca las uses en una red real.

### 3. Desplegar los contratos (terminal 2)

```bash
cd blockchain
npm run deploy:local
```

Esto crea `blockchain/deployments/localhost.json` con las direcciones y mintea
**1.000.000 USDC** de prueba a la cuenta #0.

### 4. Configurar el backend

Añade a tu `.env` (raíz del proyecto):

```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
BLOCKCHAIN_COP_PER_USDC=4000
BLOCKCHAIN_DEADLINE_DAYS=14
```

Las direcciones de `PhoneEscrow` y `MockUSDC` se leen automáticamente de
`blockchain/deployments/localhost.json`. Si despliegas en otra red, define
`BLOCKCHAIN_ESCROW_ADDRESS` y `BLOCKCHAIN_USDC_ADDRESS`.

### 5. Arrancar la API

```bash
python run.py
```

La documentación interactiva está en <http://127.0.0.1:8000/docs>, sección
**Blockchain / Escrow**.

## API

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/api/v1/blockchain/status` | Público | Estado del nodo, contratos y saldo del fondo. |
| `GET` | `/api/v1/blockchain/escrows` | Admin | Lista los escrows registrados. |
| `GET` | `/api/v1/blockchain/escrows/{order_number}` | Público | Escrow local + estado on-chain. |
| `POST` | `/api/v1/blockchain/escrows` | Admin | Deposita el total de la orden en USDC. |
| `POST` | `/api/v1/blockchain/escrows/{order_number}/confirm` | Dueño/Admin | El cliente confirma la entrega. |
| `POST` | `/api/v1/blockchain/escrows/{order_number}/release` | Admin | Libera los fondos al vendedor. |
| `POST` | `/api/v1/blockchain/escrows/{order_number}/refund` | Admin | Reembolsa los fondos al comprador. |
| `POST` | `/api/v1/blockchain/escrows/{order_number}/sync` | Admin | Sincroniza el estado local con la cadena. |

### Ejemplo

```bash
# 1. Login como admin
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@electrophone.com","password":"admin123456"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# 2. Crear escrow para una orden (el total se toma de la orden)
curl -X POST http://127.0.0.1:8000/api/v1/blockchain/escrows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_number": "ORD-ABCD1234",
    "buyer_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "cop_per_usdc": 4000
  }'

# 3. Liberar los fondos (o /refund para reembolsar)
curl -X POST http://127.0.0.1:8000/api/v1/blockchain/escrows/ORD-ABCD1234/release \
  -H "Authorization: Bearer $TOKEN"
```

El backend también actualiza la orden al liberar (`delivered` / `completed`) o
reembolsar (`cancelled` / `refunded`).

## Tests

```bash
# Contratos (Hardhat)
cd blockchain
npm test

# Backend (incluye tests del módulo blockchain con la cadena simulada)
python -m pytest tests/test_blockchain.py -q
```

## Notas de producción

1. **Token real**: reemplaza `MockUSDC` por la dirección oficial de USDC en la red elegida
   (Ethereum, Polygon, Base, etc.). Ajusta `BLOCKCHAIN_USDC_ADDRESS`.
2. **Roles**: el `FUNDER_ROLE` debe ir a una wallet caliente con saldo limitado; el
   `ARBITER_ROLE` a una multisig. El admin del contrato nunca debe ser una clave suelta.
3. **Claves**: `BLOCKCHAIN_PRIVATE_KEY` solo en el gestor de secretos. El archivo `.env`
   está ignorado por git.
4. **Confirmaciones**: el servicio espera el receipt de la transacción. Para producción,
   añade un indexador de eventos y espera N confirmaciones antes de marcar una orden como
   entregada/reembolsada.
5. **Auditoría**: antes de manejar fondos reales, audita el contrato y prueba en testnet.
6. **Tipo de cambio**: `BLOCKCHAIN_COP_PER_USDC` es una tasa fija de referencia. En
   producción conviene obtenerla de un oráculo o servicio de precios.
