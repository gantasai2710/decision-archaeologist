"""Unit tests."""
from hindsight_adapter import ReflectionResult
from tests.conftest import DEC_005_MEMORY


def test_ask_returns_answer_and_related_decisions(client, adapter):
    adapter.recall_results = [DEC_005_MEMORY]
    adapter.reflection = ReflectionResult(text="It suited a small workload.")
    r = client.post("/api/ask", json={"question": "Why did we originally choose synchronous processing?"})
    assert r.status_code == 200
    assert r.json() == {"answer": "It suited a small workload.", "related_decisions": ["DEC-005"]}


def test_ask_without_memory(client, adapter):
    adapter.recall_results = []
    body = client.post("/api/ask", json={"question": "Anything?"}).json()
    assert body["related_decisions"] == []
    assert "No relevant" in body["answer"]


def test_ask_empty_question_400(client):
    assert client.post("/api/ask", json={"question": "   "}).status_code == 400


def test_ask_reflect_failure_503(client, adapter):
    adapter.recall_results = [DEC_005_MEMORY]
    adapter.fail_reflect = True
    assert client.post("/api/ask", json={"question": "Why?"}).status_code == 503
