def test_create_order_and_track(client):
    # Obtener un teléfono con stock
    resp = client.get("/api/v1/phones?limit=1")
    phone = resp.json()["data"][0]

    # Crear orden
    resp = client.post("/api/v1/orders", json={
        "customer_name": "Cliente", "customer_email": "c@c.com", "customer_phone": "300",
        "shipping_address": "Calle 1", "city": "Bogotá", "payment_method": "pse",
        "items": [{"phone_id": phone["id"], "quantity": 1}]
    })
    assert resp.status_code == 201, resp.text
    order = resp.json()
    assert order["order_number"].startswith("ORD-")
    assert order["payment_status"] == "pending"
    assert order["status"] == "pending"
    assert order["tax"] > 0  # IVA aplicado
    assert order["total"] >= order["subtotal"]

    # Rastrear
    resp = client.get(f"/api/v1/orders/track/{order['order_number']}")
    assert resp.status_code == 200
    assert "customer_email" not in resp.json()
    assert "customer_phone" not in resp.json()
    assert "shipping_address" not in resp.json()


def test_user_order_history_route_is_not_captured_by_order_id(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.get("/api/v1/orders/my-orders", headers=headers)
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


def test_coupon_discount_on_order(client):
    from app.core.database import SessionLocal
    from app.modules.ventas.models import Coupon
    db = SessionLocal()
    try:
        coupon = Coupon(code="TEST10", discount_type="percentage", discount_value=10, is_active=True, max_uses=100)
        db.add(coupon)
        db.commit()
    finally:
        db.close()

    resp = client.get("/api/v1/phones?limit=1")
    phone = resp.json()["data"][0]

    resp = client.post("/api/v1/orders", json={
        "customer_name": "Cliente", "customer_email": "c@c.com", "customer_phone": "300",
        "shipping_address": "Calle 1", "city": "Bogotá", "payment_method": "pse",
        "coupon_code": "TEST10",
        "items": [{"phone_id": phone["id"], "quantity": 1}]
    })
    assert resp.status_code == 201, resp.text
    order = resp.json()
    expected = round(order["subtotal"] * 0.10, 2)
    assert abs(order["discount_amount"] - expected) < 0.01


def test_invalid_coupon(client):
    resp = client.get("/api/v1/phones?limit=1")
    phone = resp.json()["data"][0]
    resp = client.post("/api/v1/orders", json={
        "customer_name": "Cliente", "customer_email": "c@c.com", "customer_phone": "300",
        "shipping_address": "Calle 1", "city": "Bogotá", "payment_method": "pse",
        "coupon_code": "NOEXISTE",
        "items": [{"phone_id": phone["id"], "quantity": 1}]
    })
    assert resp.status_code == 400


def test_favorites_flow(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.get("/api/v1/phones?limit=1")
    phone_id = resp.json()["data"][0]["id"]

    # Agregar
    resp = client.post(f"/api/v1/favorites/{phone_id}", headers=headers)
    assert resp.status_code == 201
    # Duplicado
    resp = client.post(f"/api/v1/favorites/{phone_id}", headers=headers)
    assert resp.status_code == 400
    # Listar
    resp = client.get("/api/v1/favorites", headers=headers)
    assert resp.status_code == 200
    assert any(p["id"] == phone_id for p in resp.json())
    # Quitar
    resp = client.delete(f"/api/v1/favorites/{phone_id}", headers=headers)
    assert resp.status_code == 200
