"""Unit tests (Hindsight mocked)."""
from hindsight_adapter import ReflectionResult
from tests.conftest import DEC_005_MEMORY, VALID_PROPOSAL

STRUCTURED = {
    "historical_reasoning": "Synchronous processing suited a small workload.",
    "changed_conditions": ["Event volume increased"],
    "assumption_assessments": [
        {"original_assumption": "Processing remains short", "current_condition": "Some operations take seconds",
         "assessment": "Changed", "explanation": "Durations grew."}
    ],
    "changed_assumptions": [],
    "implications": ["The historical reasoning should be reconsidered."],
    "uncertainties": ["Future event growth is unknown"],
    "evidence": [],
}


def test_analyze_success(client, adapter):
    adapter.recall_results = [DEC_005_MEMORY]
    adapter.reflection = ReflectionResult(text="x", structured_output=STRUCTURED, supporting_facts=["DEC-005 fact"])
    r = client.post("/api/analyze", json=VALID_PROPOSAL)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "analyzed"
    assert body["historical_decisions"][0]["relevance_score"] == 0.91
    a = body["analysis"]
    assert a["changed_conditions"] == ["Event volume increased"]
    assert a["changed_assumptions"] == ["Processing remains short"]  # derived from the assessment verdict
    assert a["assumption_assessments"][0]["assessment"] == "changed"
    assert a["evidence"] == ["DEC-005 fact"]  # falls back to Hindsight's supporting memories
    # recalled history is handed to reflect, and the human-decision boundary is in the prompt
    assert "DEC-005" in adapter.last_reflect["context"]
    assert "Do NOT recommend" in adapter.last_reflect["query"]


def test_analyze_no_relevant_memories(client, adapter):
    adapter.recall_results = []
    body = client.post("/api/analyze", json=VALID_PROPOSAL).json()
    assert body["status"] == "no_relevant_memory"
    assert body["analysis"] is None and body["historical_decisions"] == []
    assert adapter.last_reflect == {}  # reflect never called, nothing fabricated


def test_analyze_reflect_unavailable_is_truthful(client, adapter):
    adapter.recall_results = [DEC_005_MEMORY]
    adapter.fail_reflect = True
    r = client.post("/api/analyze", json=VALID_PROPOSAL)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "recalled"
    assert body["analysis"] is None
    assert len(body["historical_decisions"]) == 1


def test_analyze_recall_failure_is_503(client, adapter):
    adapter.fail_recall = True
    assert client.post("/api/analyze", json=VALID_PROPOSAL).status_code == 503


def test_analyze_validation_error_is_400(client):
    assert client.post("/api/analyze", json={"title": "only title"}).status_code == 400
