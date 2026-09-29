"""Shared fixtures. Unit tests use FakeAdapter; no Hindsight server is needed."""
from typing import Any, Optional

import pytest
from fastapi.testclient import TestClient

from hindsight_adapter import MemoryUnavailableError, RecalledMemory, ReflectionResult
from server import create_app


class FakeAdapter:
    def __init__(self) -> None:
        self.healthy = True
        self.retained: list[dict[str, Any]] = []
        self.recall_results: list[RecalledMemory] = []
        self.reflection: Optional[ReflectionResult] = ReflectionResult(text="Reflected answer.")
        self.fail_retain = False
        self.fail_recall = False
        self.fail_reflect = False
        self.last_reflect: dict[str, Any] = {}

    async def ensure_bank(self, mission=None): ...
    async def close(self): ...

    async def health_check(self) -> bool:
        return self.healthy

    async def retain(self, content, **kw):
        if self.fail_retain:
            raise MemoryUnavailableError("retain")
        self.retained.append({"content": content, **kw})

    async def recall(self, query, **kw):
        if self.fail_recall:
            raise MemoryUnavailableError("recall")
        return self.recall_results

    async def reflect(self, query, **kw):
        if self.fail_reflect:
            raise MemoryUnavailableError("reflect")
        self.last_reflect = {"query": query, **kw}
        return self.reflection


@pytest.fixture
def adapter() -> FakeAdapter:
    return FakeAdapter()


@pytest.fixture
def client(adapter) -> TestClient:
    # raise_server_exceptions=False so the 500 handler is what we observe
    with TestClient(create_app(adapter), raise_server_exceptions=False) as c:
        yield c


DEC_005_MEMORY = RecalledMemory(
    id="m1",
    text="Decision DEC-005 chose synchronous processing, assuming processing stays short.",
    fact_type="world",
    document_id="DEC-005",
    metadata={"kind": "decision", "decision_id": "DEC-005"},
    tags=["decision", "decision:DEC-005"],
    score=0.91,
)

VALID_DECISION = {
    "decision_id": "DEC-006",
    "title": "Introduce asynchronous processing",
    "context": "The application now handles millions of events.",
    "problem": "Synchronous requests are becoming slow.",
    "chosen_option": "Background workers and a message queue",
    "rationale": "Separate long-running work from HTTP requests.",
    "assumptions": ["Event volume will continue growing"],
    "alternatives": ["Continue synchronous processing"],
    "constraints": ["Limited infrastructure budget"],
    "expected_outcome": "Faster API responses",
    "status": "proposed",
}

VALID_PROPOSAL = {
    "title": "Move processing to background workers",
    "context": "Event volume has increased. Some operations now take several seconds.",
    "proposal": "Use background workers.",
}
