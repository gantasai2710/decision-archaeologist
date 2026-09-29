"""Unit tests."""


def test_health_healthy(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "healthy", "memory": "hindsight"}


def test_health_degraded_when_hindsight_down(client, adapter):
    adapter.healthy = False
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "degraded", "memory": "unavailable"}
