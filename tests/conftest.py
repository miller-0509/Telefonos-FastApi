import os
import tempfile

import pytest

# Usar una base SQLite temporal y sin SMTP (modo consola) para los tests
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SMTP_HOST"] = ""
os.environ["CORS_ORIGINS"] = "*"
os.environ["BLOCKCHAIN_ENABLED"] = "false"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.database import Base, engine, SessionLocal  # noqa: E402
from app.core.seed import seed_database  # noqa: E402
from app.core.rate_limit import RateLimitMiddleware  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    # Limpia el rate limiter entre tests (comparten la misma IP 127.0.0.1)
    def _walk(mw):
        hits = getattr(mw, "_hits", None)
        if hits is not None:
            hits.clear()
        inner = getattr(mw, "app", None)
        if inner is not None:
            _walk(inner)

    _walk(app.middleware_stack)
    yield


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Limpiar
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def admin_token(client):
    resp = client.post("/api/v1/auth/login", json={"email": "admin@electrophone.com", "password": "admin123456"})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
