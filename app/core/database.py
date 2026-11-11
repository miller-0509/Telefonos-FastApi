import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# ---------------------------------------------------------------------------
# Resolución de ruta para SQLite
# ---------------------------------------------------------------------------
# SQLAlchemy acepta tres formas:
#   sqlite:///ruta/relativa.db   -> relativa al CWD
#   sqlite:////ruta/absoluta.db  -> absoluta (4 slashes)
# En Coolify/Docker el WORKDIR es /app, así que:
#   DATABASE_URL=sqlite:///./data/telefonos.db  ->  /app/data/telefonos.db  ✓
#   DATABASE_URL=sqlite:////app/data/telefonos.db  (equivalente absoluto)   ✓
# Nos aseguramos de que el directorio exista antes de abrir la conexión.

_db_url = settings.DATABASE_URL

if _db_url.startswith("sqlite"):
    # Extraemos la parte de ruta (después de sqlite:/// o sqlite:////)
    if _db_url.startswith("sqlite:////"):
        # Ruta absoluta: sqlite:////ruta/abs
        _raw_path = "/" + _db_url[len("sqlite:////"):]
    else:
        # Ruta relativa: sqlite:///./algo  o  sqlite:///algo
        _raw_path = _db_url[len("sqlite:///"):]

    # Convertir a ruta absoluta (respeta el CWD del proceso, que en Docker es /app)
    _db_abs_path = os.path.abspath(_raw_path)

    # Crear directorio si no existe (p.ej. /app/data)
    _db_dir = os.path.dirname(_db_abs_path)
    os.makedirs(_db_dir, exist_ok=True)

    # Reescribir la URL con la ruta absoluta para evitar ambigüedades
    _db_url = f"sqlite:///{_db_abs_path}"

    print(f"[DB] SQLite path resuelto: {_db_abs_path}")

# ---------------------------------------------------------------------------

# SQLite requires check_same_thread=False for multiple concurrent requests
connect_args = {"check_same_thread": False} if _db_url.startswith("sqlite") else {}

engine = create_engine(
    _db_url,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for obtaining database sessions per request"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_sqlite_file_path() -> str:
    """Devuelve la ruta absoluta al archivo .db cuando se usa SQLite."""
    if _db_url.startswith("sqlite:////"):
        return "/" + _db_url[len("sqlite:////"):]
    return _db_url[len("sqlite:///"):]


def migrate_sqlite_schema():
    """Añade columnas nuevas a tablas existentes en SQLite (CREATE TABLE IF NOT EXISTS no las agrega)."""
    if not _db_url.startswith("sqlite"):
        return
    import sqlite3
    db_path = _get_sqlite_file_path()
    print(f"[DB] Ejecutando migrate_sqlite_schema en: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # users: columnas de verificación por correo
    cur.execute("PRAGMA table_info(users)")
    cols = {row[1] for row in cur.fetchall()}
    if "is_verified" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0")
    if "verification_token" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)")
    if "verification_token_expires" not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN verification_token_expires DATETIME")

    # reviews: columna user_id (ligar reseña a cuenta de usuario)
    cur.execute("PRAGMA table_info(reviews)")
    rcols = {row[1] for row in cur.fetchall()}
    if "user_id" not in rcols:
        cur.execute("ALTER TABLE reviews ADD COLUMN user_id INTEGER REFERENCES users(id)")

    # orders: columna tax (IVA 19% Colombia)
    cur.execute("PRAGMA table_info(orders)")
    ocols = {row[1] for row in cur.fetchall()}
    if "tax" not in ocols:
        cur.execute("ALTER TABLE orders ADD COLUMN tax FLOAT DEFAULT 0.0")

    conn.commit()
    conn.close()
