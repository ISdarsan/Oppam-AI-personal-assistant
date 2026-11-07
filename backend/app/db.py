"""SQLite persistence for the shared community data (users, requests, family links, SOS, notifications).

The database lives in backend/data/koode.db by default (override with KOODE_DB_URL).
"""
import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

_default_dir = Path(__file__).resolve().parent.parent / "data"
_default_dir.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("KOODE_DB_URL", f"sqlite:///{(_default_dir / 'koode.db').as_posix()}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_conn, _):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA foreign_keys=ON")
    cur.execute("PRAGMA busy_timeout=5000")
    cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from . import models  # noqa: F401  (register tables)
    Base.metadata.create_all(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
