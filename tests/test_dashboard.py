def test_coupons_admin_crud(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Crear
    resp = client.post("/api/v1/coupons", json={"code": "CRUD10", "discount_type": "percentage", "discount_value": 10}, headers=headers)
    assert resp.status_code == 201

    # Duplicado
    resp = client.post("/api/v1/coupons", json={"code": "CRUD10", "discount_type": "percentage", "discount_value": 10}, headers=headers)
    assert resp.status_code == 400

    # Listar
    resp = client.get("/api/v1/coupons", headers=headers)
    assert resp.status_code == 200
    assert any(c["code"] == "CRUD10" for c in resp.json())

    # Validar (público)
    resp = client.post("/api/v1/coupons/validate", json={"code": "CRUD10", "subtotal": 1000000})
    assert resp.status_code == 200
    assert resp.json()["discount_amount"] == 100000.0


def test_coupons_require_admin(client):
    resp = client.get("/api/v1/coupons")
    assert resp.status_code == 401


def test_admin_metrics(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.get("/api/v1/admin/metrics", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_revenue" in data
    assert "total_orders" in data


def test_legacy_admin_page_redirects_to_react(client):
    from app.core.config import settings

    resp = client.get("/admin", follow_redirects=False)
    assert resp.status_code == 307
    assert resp.headers["location"] == f"{settings.FRONTEND_URL}/admin"


def test_rate_limit_login(client):
    # Hacer muchos intentos fallidos de login
    last_status = 0
    for _ in range(12):
        resp = client.post("/api/v1/auth/login", json={"email": "x@x.com", "password": "wrong"})
        last_status = resp.status_code
    # Después del límite debe dar 429
    assert last_status == 429
