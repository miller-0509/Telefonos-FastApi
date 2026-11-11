"""Servicio de integración con el contrato PhoneEscrow (USDC) usando web3.py.

La app puede arrancar sin web3 ni un nodo disponible: todas las operaciones
llaman a `ensure_enabled()` y devuelven errores claros si el módulo está apagado.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_DOWN
from pathlib import Path
from typing import Any, Optional, Tuple

from app.core.config import settings

try:  # pragma: no cover - depende del entorno de ejecución
    from web3 import Web3

    WEB3_AVAILABLE = True
except ImportError:  # pragma: no cover
    Web3 = None  # type: ignore[assignment]
    WEB3_AVAILABLE = False


USDC_DECIMALS = 6
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
TOKEN_DECIMALS = Decimal(10) ** USDC_DECIMALS

STATUS_MAP = {
    0: "pending",
    1: "funded",
    2: "released",
    3: "refunded",
}


class BlockchainError(RuntimeError):
    """Error de negocio o de comunicación con la cadena."""


class BlockchainDisabled(BlockchainError):
    """El módulo blockchain está desactivado en la configuración."""


class BlockchainNotConfigured(BlockchainError):
    """Falta configuración o dependencias para operar."""


ESCROW_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "orderRef", "type": "bytes32"},
            {"internalType": "address", "name": "buyer", "type": "address"},
            {"internalType": "address", "name": "seller", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"},
        ],
        "name": "fundEscrow",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "orderRef", "type": "bytes32"}],
        "name": "release",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "orderRef", "type": "bytes32"}],
        "name": "refund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "orderRef", "type": "bytes32"}],
        "name": "getEscrow",
        "outputs": [
            {
                "components": [
                    {"internalType": "address", "name": "buyer", "type": "address"},
                    {"internalType": "address", "name": "seller", "type": "address"},
                    {"internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"internalType": "uint256", "name": "deadline", "type": "uint256"},
                    {
                        "internalType": "enum PhoneEscrow.Status",
                        "name": "status",
                        "type": "uint8",
                    },
                ],
                "internalType": "struct PhoneEscrow.Escrow",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "orderRef", "type": "bytes32"}],
        "name": "escrowStatus",
        "outputs": [
            {"internalType": "enum PhoneEscrow.Status", "name": "", "type": "uint8"}
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "totalEscrowed",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "token",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "orderRef", "type": "bytes32"},
            {"indexed": True, "internalType": "address", "name": "buyer", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "seller", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "deadline", "type": "uint256"},
        ],
        "name": "EscrowFunded",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "orderRef", "type": "bytes32"},
            {"indexed": True, "internalType": "address", "name": "seller", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
        ],
        "name": "EscrowReleased",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "orderRef", "type": "bytes32"},
            {"indexed": True, "internalType": "address", "name": "buyer", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
        ],
        "name": "EscrowRefunded",
        "type": "event",
    },
]

ERC20_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "address", "name": "spender", "type": "address"},
        ],
        "name": "allowance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "spender", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
        ],
        "name": "approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
]


def ensure_enabled() -> None:
    if not settings.BLOCKCHAIN_ENABLED:
        raise BlockchainDisabled(
            "El módulo blockchain está desactivado. Configura BLOCKCHAIN_ENABLED=true."
        )
    if not WEB3_AVAILABLE:
        raise BlockchainNotConfigured(
            "La librería web3 no está instalada. Ejecuta: pip install -r requirements.txt"
        )


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_deployment() -> dict:
    raw_path = (settings.BLOCKCHAIN_DEPLOYMENT_FILE or "").strip()
    if not raw_path:
        return {}
    path = Path(raw_path)
    if not path.is_absolute():
        path = _project_root() / path
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def get_addresses() -> Tuple[str, str, str]:
    """Devuelve (escrow, usdc, seller), priorizando variables de entorno."""
    deployment = _load_deployment()
    escrow = (settings.BLOCKCHAIN_ESCROW_ADDRESS or deployment.get("escrow") or "").strip()
    usdc = (settings.BLOCKCHAIN_USDC_ADDRESS or deployment.get("usdc") or "").strip()
    seller = (
        settings.BLOCKCHAIN_SELLER_ADDRESS
        or deployment.get("deployer")
        or ""
    ).strip()
    return escrow, usdc, seller


def get_web3():
    ensure_enabled()
    try:
        provider = Web3.HTTPProvider(
            settings.BLOCKCHAIN_RPC_URL, request_kwargs={"timeout": 10}
        )
        w3 = Web3(provider)
    except Exception as exc:  # pragma: no cover - defensivo
        raise BlockchainNotConfigured(f"No se pudo crear el cliente web3: {exc}") from exc

    if not w3.is_connected():
        raise BlockchainNotConfigured(
            f"No se pudo conectar al nodo blockchain en {settings.BLOCKCHAIN_RPC_URL}. "
            "¿Está corriendo `npm run node` en la carpeta blockchain?"
        )

    chain_id = w3.eth.chain_id
    if settings.BLOCKCHAIN_CHAIN_ID and chain_id != settings.BLOCKCHAIN_CHAIN_ID:
        raise BlockchainNotConfigured(
            f"El nodo está en chainId {chain_id}, pero BLOCKCHAIN_CHAIN_ID="
            f"{settings.BLOCKCHAIN_CHAIN_ID}. Ajusta la configuración."
        )
    return w3


def _account(w3):
    private_key = (settings.BLOCKCHAIN_PRIVATE_KEY or "").strip()
    if not private_key:
        raise BlockchainNotConfigured(
            "Falta BLOCKCHAIN_PRIVATE_KEY (cuenta que deposita y libera los fondos)."
        )
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key
    try:
        return w3.eth.account.from_key(private_key)
    except Exception as exc:
        raise BlockchainNotConfigured(f"BLOCKCHAIN_PRIVATE_KEY inválida: {exc}") from exc


def _account_or_none(w3):
    try:
        return _account(w3)
    except BlockchainError:
        return None


def _contracts(w3):
    escrow_address, usdc_address, _ = get_addresses()
    if not escrow_address or not usdc_address:
        raise BlockchainNotConfigured(
            "Faltan las direcciones del contrato. Despliega con `npm run deploy:local` "
            "o define BLOCKCHAIN_ESCROW_ADDRESS y BLOCKCHAIN_USDC_ADDRESS."
        )
    try:
        escrow = w3.eth.contract(
            address=w3.to_checksum_address(escrow_address), abi=ESCROW_ABI
        )
        token = w3.eth.contract(
            address=w3.to_checksum_address(usdc_address), abi=ERC20_ABI
        )
    except Exception as exc:
        raise BlockchainNotConfigured(f"Direcciones de contrato inválidas: {exc}") from exc
    return escrow, token


def order_ref(order_number: str):
    ensure_enabled()
    return Web3.keccak(text=order_number)


def _bytes32(value: str):
    try:
        return Web3.to_bytes(hexstr=value)
    except Exception as exc:
        raise BlockchainError(f"order_ref inválido: {value}") from exc


def cop_to_units(amount_cop: float, cop_per_usdc: float) -> Tuple[int, float]:
    rate = Decimal(str(cop_per_usdc))
    if rate <= 0:
        raise BlockchainError("La tasa COP/USDC debe ser mayor que cero.")
    units = (
        (Decimal(str(amount_cop)) / rate) * TOKEN_DECIMALS
    ).to_integral_value(rounding=ROUND_DOWN)
    amount_usdc = float(Decimal(int(units)) / TOKEN_DECIMALS)
    return int(units), amount_usdc


def _send_transaction(w3, account, function) -> Tuple[str, Any]:
    try:
        estimated_gas = function.estimate_gas({"from": account.address})
    except Exception as exc:
        raise BlockchainError(
            f"El contrato rechazaría la transacción: {exc}"
        ) from exc

    latest_block = w3.eth.get_block("latest")
    tx_params = {
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address, "pending"),
        "chainId": w3.eth.chain_id,
        "gas": int(estimated_gas * 1.25) + 1000,
    }
    base_fee = latest_block.get("baseFeePerGas")
    if base_fee is not None:
        priority_fee = w3.to_wei(1, "gwei")
        tx_params["maxPriorityFeePerGas"] = priority_fee
        tx_params["maxFeePerGas"] = int(base_fee) * 2 + priority_fee
    else:
        tx_params["gasPrice"] = w3.eth.gas_price

    try:
        tx = function.build_transaction(tx_params)
        signed = account.sign_transaction(tx)
        raw_tx = getattr(signed, "raw_transaction", None)
        if raw_tx is None:  # web3 < 7
            raw_tx = getattr(signed, "rawTransaction")
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        receipt = w3.eth.wait_for_transaction_receipt(
            tx_hash, timeout=settings.BLOCKCHAIN_TX_TIMEOUT
        )
    except Exception as exc:
        raise BlockchainError(f"Error enviando la transacción: {exc}") from exc

    if receipt.status != 1:
        raise BlockchainError(
            f"La transacción {Web3.to_hex(tx_hash)} falló on-chain (status={receipt.status})."
        )
    return Web3.to_hex(tx_hash), receipt


def _ensure_allowance(w3, account, token, escrow_address: str, amount_units: int) -> None:
    allowance = token.functions.allowance(account.address, escrow_address).call()
    if allowance >= amount_units:
        return
    _send_transaction(
        w3, account, token.functions.approve(escrow_address, amount_units)
    )


def create_escrow(
    *,
    order_number: str,
    buyer_address: str,
    amount_cop: float,
    seller_address: Optional[str] = None,
    cop_per_usdc: Optional[float] = None,
    deadline_days: Optional[int] = None,
) -> dict:
    """Deposita en custodia el equivalente en USDC del total de una orden."""
    ensure_enabled()
    w3 = get_web3()
    account = _account(w3)
    escrow_contract, token_contract = _contracts(w3)
    _, _, default_seller = get_addresses()

    seller = seller_address or default_seller
    if not seller:
        raise BlockchainNotConfigured(
            "Falta la dirección del vendedor (BLOCKCHAIN_SELLER_ADDRESS)."
        )

    try:
        buyer = w3.to_checksum_address(buyer_address)
        seller = w3.to_checksum_address(seller)
    except Exception as exc:
        raise BlockchainError(f"Dirección inválida: {exc}") from exc

    if buyer == ZERO_ADDRESS or seller == ZERO_ADDRESS:
        raise BlockchainError("Las direcciones de comprador y vendedor no pueden ser cero.")

    rate = float(cop_per_usdc or settings.BLOCKCHAIN_COP_PER_USDC)
    amount_units, amount_usdc = cop_to_units(amount_cop, rate)
    if amount_units <= 0:
        raise BlockchainError("El monto en USDC calculado es cero; revisa la tasa COP/USDC.")

    days = int(deadline_days or settings.BLOCKCHAIN_DEADLINE_DAYS)
    deadline_dt = datetime.now(timezone.utc) + timedelta(days=days)
    deadline_ts = int(deadline_dt.timestamp())

    balance = token_contract.functions.balanceOf(account.address).call()
    if balance < amount_units:
        raise BlockchainError(
            "Saldo USDC insuficiente en la cuenta del fondo. "
            f"Requerido: {amount_usdc} USDC, disponible: {balance / 10 ** USDC_DECIMALS} USDC."
        )

    _ensure_allowance(
        w3, account, token_contract, escrow_contract.address, amount_units
    )

    ref = order_ref(order_number)
    tx_hash, receipt = _send_transaction(
        w3,
        account,
        escrow_contract.functions.fundEscrow(
            ref, buyer, seller, amount_units, deadline_ts
        ),
    )

    return {
        "order_ref": Web3.to_hex(ref),
        "buyer_address": buyer,
        "seller_address": seller,
        "amount_units": str(amount_units),
        "amount_usdc": amount_usdc,
        "cop_per_usdc": rate,
        "deadline": deadline_dt,
        "deadline_ts": deadline_ts,
        "tx_hash": tx_hash,
        "block_number": receipt.blockNumber,
        "status": "funded",
        "chain_id": w3.eth.chain_id,
        "escrow_address": escrow_contract.address,
        "usdc_address": token_contract.address,
    }


def release_escrow(order_ref_hex: str) -> dict:
    """Libera los fondos del escrow al vendedor (confirma la entrega)."""
    ensure_enabled()
    w3 = get_web3()
    account = _account(w3)
    escrow_contract, _ = _contracts(w3)

    tx_hash, receipt = _send_transaction(
        w3, account, escrow_contract.functions.release(_bytes32(order_ref_hex))
    )
    return {
        "tx_hash": tx_hash,
        "block_number": receipt.blockNumber,
        "status": "released",
    }


def refund_escrow(order_ref_hex: str) -> dict:
    """Reembolsa los fondos del escrow al comprador."""
    ensure_enabled()
    w3 = get_web3()
    account = _account(w3)
    escrow_contract, _ = _contracts(w3)

    tx_hash, receipt = _send_transaction(
        w3, account, escrow_contract.functions.refund(_bytes32(order_ref_hex))
    )
    return {
        "tx_hash": tx_hash,
        "block_number": receipt.blockNumber,
        "status": "refunded",
    }


def get_escrow(order_ref_hex: str) -> dict:
    """Lee el estado actual del escrow directamente del contrato."""
    ensure_enabled()
    w3 = get_web3()
    escrow_contract, _ = _contracts(w3)
    ref = _bytes32(order_ref_hex)

    data = escrow_contract.functions.getEscrow(ref).call()
    buyer, seller, amount, deadline_ts, status_code = data
    deadline_dt = datetime.fromtimestamp(int(deadline_ts), tz=timezone.utc)

    return {
        "order_ref": Web3.to_hex(ref),
        "buyer_address": buyer,
        "seller_address": seller,
        "amount_units": str(int(amount)),
        "amount_usdc": float(Decimal(int(amount)) / TOKEN_DECIMALS),
        "deadline_ts": int(deadline_ts),
        "deadline": deadline_dt,
        "status": STATUS_MAP.get(int(status_code), "unknown"),
    }


def get_status() -> dict:
    """Estado de la conexión, contratos y saldo del fondo."""
    ensure_enabled()
    w3 = get_web3()
    escrow_address, usdc_address, seller_address = get_addresses()

    result = {
        "enabled": True,
        "connected": True,
        "chain_id": w3.eth.chain_id,
        "rpc_url": settings.BLOCKCHAIN_RPC_URL,
        "escrow_address": escrow_address or None,
        "usdc_address": usdc_address or None,
        "seller_address": seller_address or None,
        "funder_address": None,
        "usdc_balance": None,
        "total_escrowed_usdc": None,
        "block_number": w3.eth.block_number,
        "explorer_url": settings.BLOCKCHAIN_EXPLORER_URL or None,
    }

    account = _account_or_none(w3)
    if account is not None:
        result["funder_address"] = account.address

    if not escrow_address or not usdc_address:
        return result

    escrow_contract, token_contract = _contracts(w3)
    result["total_escrowed_usdc"] = float(
        Decimal(int(escrow_contract.functions.totalEscrowed().call())) / TOKEN_DECIMALS
    )
    if account is not None:
        balance = token_contract.functions.balanceOf(account.address).call()
        result["usdc_balance"] = float(Decimal(int(balance)) / TOKEN_DECIMALS)

    return result
