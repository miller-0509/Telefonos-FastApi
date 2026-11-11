from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# SQLite requires check_same_thread=False for multiple concurrent requests
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
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


def migrate_sqlite_schema():
    """Añade columnas nuevas a tablas existentes en SQLite (CREATE TABLE IF NOT EXISTS no las agrega)."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    import sqlite3
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
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
