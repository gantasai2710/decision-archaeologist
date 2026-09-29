"""Unit tests."""
from tests.conftest import VALID_DECISION

VALID_OUTCOME = {
    "decision_id": "DEC-006",
    "observed_at": "2026-10-15",
    "outcome": "Average API response time decreased.",
    "observations": ["Infrastructure costs increased"],
    "lessons": ["Asynchronous processing helps with long-running tasks"],
}


def test_valid_outcome_retained(client, adapter):
    client.post("/api/decisions", json=VALID_DECISION)
    r = client.post("/api/outcomes", json=VALID_OUTCOME)
    assert r.status_code == 200
    assert r.json() == {"success": True, "decision_id": "DEC-006", "memory_status": "retained"}
    stored = adapter.retained[-1]
    assert "Lessons learned" in stored["content"] and "Infrastructure costs increased" in stored["content"]
    assert "Introduce asynchronous processing" in stored["content"]  # title linked via local helper
    assert "decision:DEC-006" in stored["tags"]


def test_invalid_date_returns_400(client):
    r = client.post("/api/outcomes", json={**VALID_OUTCOME, "observed_at": "next tuesday"})
    assert r.status_code == 400


def test_missing_outcome_returns_400(client):
    body = {k: v for k, v in VALID_OUTCOME.items() if k != "outcome"}
    assert client.post("/api/outcomes", json=body).status_code == 400
