from __future__ import annotations

from functools import lru_cache

from sqlalchemy import Engine, create_engine, text

from app.config import get_settings


@lru_cache
def get_engine() -> Engine:
    return create_engine(get_settings().database_url, pool_pre_ping=True)


def check_db() -> tuple[bool, str]:
    """Return (ok, detail). Never raises."""
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "ok"
    except Exception as exc:  # noqa: BLE001 - report any failure to /health
        return False, f"database unreachable: {type(exc).__name__}"
