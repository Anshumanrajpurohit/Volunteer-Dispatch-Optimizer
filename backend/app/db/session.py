from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


settings = get_settings()
database_url = settings.database_url


def _build_connect_args() -> dict[str, object]:
    url = make_url(database_url)

    if url.drivername.startswith("sqlite"):
        return {"check_same_thread": False}

    connect_args: dict[str, object] = {"connect_timeout": 10}
    if url.drivername.startswith("postgresql") and "sslmode" not in url.query:
        connect_args["sslmode"] = "require"
    return connect_args


engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=30,
    future=True,
    connect_args=_build_connect_args(),
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
