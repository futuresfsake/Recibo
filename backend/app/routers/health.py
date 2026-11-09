from __future__ import annotations

import httpx
from fastapi import APIRouter

from app.config import get_settings
from app.db import check_db

router = APIRouter()


def check_ollama() -> tuple[bool, str]:
    """Return (ok, detail). Also reports a missing model. Never raises."""
    s = get_settings()
    try:
        r = httpx.get(f"{s.ollama_base_url}/api/tags", timeout=3.0)
        r.raise_for_status()
        names = {m.get("name", "") for m in r.json().get("models", [])}
    except Exception as exc:  # noqa: BLE001
        return False, f"ollama unreachable: {type(exc).__name__}"
    missing = [m for m in (s.llm_model, s.embed_model)
               if not any(n == m or n.startswith(f"{m}:") for n in names)]
    if missing:
        return False, f"model not pulled: {', '.join(missing)} (run: ollama pull <model>)"
    return True, "ok"


@router.get("/health")
def health() -> dict[str, object]:
    db_ok, db_detail = check_db()
    ol_ok, ol_detail = check_ollama()
    return {
        "status": "ok" if db_ok and ol_ok else "degraded",
        "database": {"ok": db_ok, "detail": db_detail},
        "ollama": {"ok": ol_ok, "detail": ol_detail},
    }
