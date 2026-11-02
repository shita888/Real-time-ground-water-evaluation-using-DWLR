# backend/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import contextmanager

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/app.db")

# --- ensure directory exists for SQLite ---
if DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

# SQLite needs special args for multithreaded use (APScheduler + Flask)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Engine
engine = create_engine(
    DATABASE_URL,
    echo=False,         # set True for SQL debugging
    future=True,
    connect_args=connect_args,
)

# ORM base + session factory
Base = declarative_base()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    """Call this at startup to create tables."""
    import backend.models.subscriber
    import backend.models.alert_log
    import backend.models.user

    Base.metadata.create_all(bind=engine)


@contextmanager
def get_session():
    """
    Context manager that yields a session and ensures cleanup.
    Usage:
        with get_session() as session:
            session.add(obj)
            session.commit()
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
