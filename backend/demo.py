"""Runs the core demo against a live server: DEC-005 -> analyze -> DEC-006 -> outcome.

Usage (server + Hindsight running):  python demo.py
"""
import json
import os

import httpx

BASE = os.getenv("API_URL", "http://localhost:8000")


def show(title: str, r: httpx.Response) -> None:
    print(f"\n=== {title} [{r.status_code}]")
    print(json.dumps(r.json(), indent=2))


with httpx.Client(base_url=BASE, timeout=180) as c:
    show("health", c.get("/api/health"))

    show("record DEC-005", c.post("/api/decisions", json={
        "decision_id": "DEC-005",
        "title": "Use synchronous processing",
        "context": "Small workload; the team wants a simple, debuggable system.",
        "problem": "Incoming events need to be processed.",
        "chosen_option": "Process events synchronously inside the HTTP request",
        "rationale": "Small workload, simple implementation, easy debugging.",
        "assumptions": ["Processing remains short", "Request volume remains manageable"],
        "alternatives": [],
        "constraints": [],
        "expected_outcome": "A simple system that is easy to debug",
        "status": "active",
    }))

    show("analyze new proposal", c.post("/api/analyze", json={
        "title": "Move processing to background workers",
        "context": "Event volume has increased. Some operations now take several seconds.",
        "proposal": "Use background workers.",
    }))

    show("record DEC-006 (human decision)", c.post("/api/decisions", json={
        "decision_id": "DEC-006",
        "title": "Introduce asynchronous processing",
        "context": "Event volume has grown and some operations take several seconds.",
        "problem": "Synchronous requests are becoming slow.",
        "chosen_option": "Background workers and a message queue",
        "rationale": "Separate long-running work from HTTP requests.",
        "assumptions": ["Event volume will continue growing", "Background processing is acceptable"],
        "alternatives": ["Continue synchronous processing"],
        "constraints": ["Limited infrastructure budget"],
        "expected_outcome": "Faster API responses",
        "status": "active",
    }))

    show("record outcome", c.post("/api/outcomes", json={
        "decision_id": "DEC-006",
        "observed_at": "2026-10-15",
        "outcome": "Average API response time decreased.",
        "observations": ["Background jobs process events successfully", "Infrastructure costs increased"],
        "lessons": ["Asynchronous processing helps with long-running tasks"],
    }))

    show("ask", c.post("/api/ask", json={"question": "Why did we originally choose synchronous processing?"}))
