"""Unit tests."""
from tests.conftest import VALID_DECISION


def test_valid_decision_is_retained_with_full_reasoning(client, adapter):
    r = client.post("/api/decisions", json=VALID_DECISION)
    assert r.status_code == 200
    assert r.json() == {"success": True, "decision_id": "DEC-006", "memory_status": "retained"}
    stored = adapter.retained[0]
    assert stored["document_id"] == "DEC-006"
    for needle in ("Rationale", "Event volume will continue growing", "Limited infrastructure budget", "Faster API responses"):
        assert needle in stored["content"]


def test_invalid_status_returns_400(client):
    r = client.post("/api/decisions", json={**VALID_DECISION, "status": "maybe"})
    assert r.status_code == 400
    assert r.json()["error"] == "VALIDATION_ERROR"


def test_missing_field_returns_400(client):
    body = {k: v for k, v in VALID_DECISION.items() if k != "rationale"}
    r = client.post("/api/decisions", json=body)
    assert r.status_code == 400
    assert "rationale" in r.json()["message"]


def test_hindsight_down_returns_503(client, adapter):
    adapter.fail_retain = True
    r = client.post("/api/decisions", json=VALID_DECISION)
    assert r.status_code == 503
    assert r.json() == {"error": "MEMORY_SERVICE_UNAVAILABLE", "message": "Hindsight memory service is unavailable."}


def test_follow_up_relationship_is_retained(client, adapter):
    body = {
        **VALID_DECISION,
        "supersedes": "DEC-005",
        "trigger": "Request latency increased after operations began taking seconds",
        "proposal_title": "Move event processing to background workers",
    }

    r = client.post("/api/decisions", json=body)

    assert r.status_code == 200
    stored = adapter.retained[0]
    assert stored["metadata"]["supersedes"] == "DEC-005"
    assert stored["metadata"]["trigger"] == body["trigger"]
    assert stored["metadata"]["proposal_title"] == body["title"]
    assert stored["metadata"]["proposal_title"] != body["proposal_title"]
    assert "supersedes:DEC-005" in stored["tags"]
    assert "Follow-up to decision: DEC-005" in stored["content"]
    assert f"Proposal title: {body['title']}" in stored["content"]
