"""INTEGRATION tests: need a running Hindsight (with an LLM configured) at HINDSIGHT_URL.

Run:  HINDSIGHT_INTEGRATION=1 pytest tests/test_integration.py
"""
import os

import pytest
from fastapi.testclient import TestClient

from server import create_app
from tests.conftest import VALID_PROPOSAL

pytestmark = pytest.mark.integration


@pytest.mark.skipif(not os.getenv("HINDSIGHT_INTEGRATION"), reason="set HINDSIGHT_INTEGRATION=1")
def test_core_demo_flow():
    dec5 = {
        "decision_id": "DEC-005", "title": "Use synchronous processing",
        "context": "Small workload, simple implementation, easy debugging.",
        "problem": "We need to process incoming events.",
        "chosen_option": "Process events synchronously inside the request",
        "rationale": "Small workload, simple implementation, easy debugging.",
        "assumptions": ["Processing remains short", "Request volume remains manageable"],
        "alternatives": [], "constraints": [], "expected_outcome": "Simple, debuggable system", "status": "active",
    }
    with TestClient(create_app()) as c:
        assert c.get("/api/health").json()["status"] == "healthy"
        assert c.post("/api/decisions", json=dec5).status_code == 200
        r = c.post("/api/analyze", json=VALID_PROPOSAL)
        assert r.status_code == 200
        assert r.json()["status"] in ("analyzed", "recalled")
