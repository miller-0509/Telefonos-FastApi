import hashlib
from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import settings
from app.modules.blockchain import service


def _create_order(client):
    resp = client.get("/api/v1/phones?limit=1")
    phone = resp.json()["data"][0]

    resp = client.post(
        "/api/v1/orders",
        json={
            "customer_name": "Cliente Blockchain",
            "customer_email": "blockchain@test.com",
            "customer_phone": "3001234567",
            "shipping_address": "Calle 1",
            "city": "Bogotá",
            "payment_method": "pse",
            "items": [{"phone_id": phone["id"], "quantity": 1}],
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _fake_ref(order_number: str) -> str:
    return "0x" + hashlib.sha256(order_number.encode()).hexdigest()


def _fake_create_escrow(**kwargs):
    rate = kwargs.get("cop_per_usdc") or settings.BLOCKCHAIN_COP_PER_USDC
    units, usdc = service.cop_to_units(kwargs["amount_cop"], rate)
    deadline = datetime.now(timezone.utc) + timedelta(
        days=kwargs.get("deadline_days") or settings.BLOCKCHAIN_DEADLINE_DAYS
    )
    return {
        "order_ref": _fake_ref(kwargs["order_number"]),
        "buyer_address": kwargs["buyer_address"],
        "seller_address": kwargs.get("seller_address") or "0x" + "11" * 20,
        "amount_units": str(units),
        "amount_usdc": usdc,
        "cop_per_usdc": float(rate),
        "deadline": deadline,
        "deadline_ts": int(deadline.timestamp()),
        "tx_hash": "0x" + "aa" * 32,
        "block_number": 1,
        "status": "funded",
    }


def _fake_get_escrow(order_ref: str, status: str = "funded"):
    deadline = datetime.now(timezone.utc) + timedelta(days=14)
    return {
        "order_ref": order_ref,
        "buyer_address": "0x" + "22" * 20,
        "seller_address": "0x" + "11" * 20,
        "amount_units": "1000000",
        "amount_usdc": 1.0,
        "deadline_ts": int(deadline.timestamp()),
        "deadline": deadline,
        "status": status,
    }


@pytest.fixture()
def blockchain_enabled(monkeypatch):
    monkeypatch.setattr(settings, "BLOCKCHAIN_ENABLED", True)
    yield


def test_status_disabled_returns_503(client):
    resp = client.get("/api/v1/blockchain/status")
    assert resp.status_code == 503
    assert "desactivado" in resp.json()["detail"].lower()


def test_create_escrow_requires_authentication(client):
    resp = client.post(
        "/api/v1/blockchain/escrows",
        json={
            "order_number": "ORD-NOEXISTE",
            "buyer_address": "0x" + "22" * 20,
        },
    )
    assert resp.status_code in (401, 403)


def test_cop_to_units():
    units, usdc = service.cop_to_units(4_000_000, 4000)
    assert units == 1_000_000_000  # 1000 USDC con 6 decimales
    assert usdc == 1000.0


def test_escrow_creation_and_query(client, admin_token, monkeypatch, blockchain_enabled):
    monkeypatch.setattr(service, "create_escrow", _fake_create_escrow)
    monkeypatch.setattr(service, "get_escrow", _fake_get_escrow)

    order = _create_order(client)
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/api/v1/blockchain/escrows",
        json={
            "order_number": order["order_number"],
            "buyer_address": "0x" + "22" * 20,
            "cop_per_usdc": 4000,
            "deadline_days": 14,
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    escrow = resp.json()
    assert escrow["status"] == "funded"
    assert escrow["order_number"] == order["order_number"]
    assert escrow["amount_cop"] == order["total"]
    assert escrow["order_ref"] == _fake_ref(order["order_number"])
    assert escrow["fund_tx_hash"] == "0x" + "aa" * 32

    # Consulta pública del detalle con estado on-chain
    resp = client.get(f"/api/v1/blockchain/escrows/{order['order_number']}")
    assert resp.status_code == 200, resp.text
    detail = resp.json()
    assert detail["status"] == "funded"
    assert detail["onchain"]["status"] == "funded"
    assert detail["onchain_error"] is None

    # No se permite duplicar el escrow
    resp = client.post(
        "/api/v1/blockchain/escrows",
        json={
            "order_number": order["order_number"],
            "buyer_address": "0x" + "22" * 20,
        },
        headers=headers,
    )
    assert resp.status_code == 400


def test_release_marks_order_as_delivered(client, admin_token, monkeypatch, blockchain_enabled):
    monkeypatch.setattr(service, "create_escrow", _fake_create_escrow)
    monkeypatch.setattr(
        service,
        "release_escrow",
        lambda order_ref: {
            "tx_hash": "0x" + "bb" * 32,
            "block_number": 2,
            "status": "released",
        },
    )

    order = _create_order(client)
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/api/v1/blockchain/escrows",
        json={"order_number": order["order_number"], "buyer_address": "0x" + "22" * 20},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text

    resp = client.post(
        f"/api/v1/blockchain/escrows/{order['order_number']}/release", headers=headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "released"
    assert resp.json()["tx_hash"] == "0x" + "bb" * 32

    resp = client.get(f"/api/v1/orders/track/{order['order_number']}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "delivered"
    assert resp.json()["payment_status"] == "completed"

    # Un escrow liberado ya no se puede liberar de nuevo
    resp = client.post(
        f"/api/v1/blockchain/escrows/{order['order_number']}/release", headers=headers
    )
    assert resp.status_code == 400


def test_refund_marks_order_as_cancelled(client, admin_token, monkeypatch, blockchain_enabled):
    monkeypatch.setattr(service, "create_escrow", _fake_create_escrow)
    monkeypatch.setattr(
        service,
        "refund_escrow",
        lambda order_ref: {
            "tx_hash": "0x" + "cc" * 32,
            "block_number": 3,
            "status": "refunded",
        },
    )

    order = _create_order(client)
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/api/v1/blockchain/escrows",
        json={"order_number": order["order_number"], "buyer_address": "0x" + "22" * 20},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text

    resp = client.post(
        f"/api/v1/blockchain/escrows/{order['order_number']}/refund", headers=headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "refunded"

    resp = client.get(f"/api/v1/orders/track/{order['order_number']}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"
    assert resp.json()["payment_status"] == "refunded"


def test_sync_uses_onchain_status(client, admin_token, monkeypatch, blockchain_enabled):
    monkeypatch.setattr(service, "create_escrow", _fake_create_escrow)
    monkeypatch.setattr(
        service, "get_escrow", lambda order_ref: _fake_get_escrow(order_ref, "refunded")
    )

    order = _create_order(client)
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/api/v1/blockchain/escrows",
        json={"order_number": order["order_number"], "buyer_address": "0x" + "22" * 20},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text

    resp = client.post(
        f"/api/v1/blockchain/escrows/{order['order_number']}/sync", headers=headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "refunded"
    assert resp.json()["onchain"]["status"] == "refunded"

    resp = client.get(f"/api/v1/orders/track/{order['order_number']}")
    assert resp.json()["status"] == "cancelled"
