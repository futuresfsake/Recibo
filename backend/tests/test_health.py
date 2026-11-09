from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.routers import health as health_module

client = TestClient(app)


def test_FR13_health_ok_when_all_up(monkeypatch) -> None:
    monkeypatch.setattr(health_module, "check_db", lambda: (True, "ok"))
    monkeypatch.setattr(health_module, "check_ollama", lambda: (True, "ok"))
    body = client.get("/health").json()
    assert body["status"] == "ok"


def test_FR13_health_degraded_when_ollama_down(monkeypatch) -> None:
    monkeypatch.setattr(health_module, "check_db", lambda: (True, "ok"))
    monkeypatch.setattr(health_module, "check_ollama", lambda: (False, "ollama unreachable"))
    body = client.get("/health").json()
    assert body["status"] == "degraded"
    assert body["ollama"]["ok"] is False


def test_NFR04_health_reports_missing_model(monkeypatch) -> None:
    class FakeResp:
        def raise_for_status(self) -> None: ...
        def json(self) -> dict:
            return {"models": [{"name": "nomic-embed-text:latest"}]}

    monkeypatch.setattr(health_module.httpx, "get", lambda *a, **k: FakeResp())
    ok, detail = health_module.check_ollama()
    assert ok is False
    assert "model not pulled" in detail
