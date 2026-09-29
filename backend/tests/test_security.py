"""Unit tests: CORS, error shape, secret leakage."""
import pytest
from fastapi.testclient import TestClient

from server import create_app
from tests.conftest import VALID_DECISION


def test_cors_allows_dev_origin(client):
    r = client.options(
        "/api/decisions",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
                 "Access-Control-Request-Headers": "content-type"},
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_blocks_unknown_origin(client):
    r = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers


def test_unexpected_error_is_500_without_details(adapter, monkeypatch):
    async def boom(*a, **k):
        raise RuntimeError("secret-token-123 /home/user/.env")

    monkeypatch.setattr(adapter, "retain", boom)
    with TestClient(create_app(adapter), raise_server_exceptions=False) as c:
        r = c.post("/api/decisions", json=VALID_DECISION)
    assert r.status_code == 500
    assert r.json() == {"error": "INTERNAL_ERROR", "message": "An unexpected error occurred."}
    assert "secret-token" not in r.text and "/home/" not in r.text


def test_hindsight_api_key_never_returned(adapter, monkeypatch):
    monkeypatch.setenv("HINDSIGHT_API_KEY", "super-secret-key")
    with TestClient(create_app(adapter)) as c:
        texts = [c.get("/api/health").text, c.get("/openapi.json").text, c.get("/nope").text]
    assert all("super-secret-key" not in t for t in texts)


def test_only_hindsight_mode_supported(monkeypatch):
    monkeypatch.setenv("MEMORY_MODE", "postgres")
    with pytest.raises(RuntimeError):
        create_app()


def test_cloud_settings_reach_the_adapter(monkeypatch):
    """create_app builds the real adapter from env: Cloud URL, bank, budgets (client is stubbed)."""
    import hindsight_adapter

    seen = {}

    class StubHindsight:
        def __init__(self, **kw):
            seen.update(kw)

        async def aclose(self): ...

    monkeypatch.setattr(hindsight_adapter, "Hindsight", StubHindsight)
    monkeypatch.setenv("HINDSIGHT_API_KEY", "k-123")
    monkeypatch.setenv("HINDSIGHT_REFLECT_BUDGET", "mid")
    app = create_app()
    assert seen["base_url"] == "https://api.hindsight.vectorize.io"
    assert seen["api_key"] == "k-123"
    assert app.state.engine._adapter.bank_id == "decision-arch"
    assert app.state.engine._adapter._reflect_budget == "mid"


def test_startup_does_not_touch_the_bank_by_default(adapter):
    called = []

    async def spy(mission=None):
        called.append(mission)

    adapter.ensure_bank = spy
    with TestClient(create_app(adapter)):
        pass
    assert called == []
