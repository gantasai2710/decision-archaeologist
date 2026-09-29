import os
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from fastapi.exceptions import RequestValidationError

from memory_engine import MemoryEngine


MEMORY_MODE = os.getenv("MEMORY_MODE", "local").strip().lower()
HINDSIGHT_URL = os.getenv("HINDSIGHT_URL", "http://localhost:8888")
HINDSIGHT_BANK_ID = os.getenv("HINDSIGHT_BANK_ID", "decision-arch")

memory_engine = MemoryEngine(
    mode=MEMORY_MODE,
    hindsight_url=HINDSIGHT_URL,
    bank_id=HINDSIGHT_BANK_ID,
)

app = FastAPI(title="Decision Archaeologist API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class DecisionPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    decision_id: str
    title: str
    context: str
    problem: str
    chosen_option: str
    rationale: str
    expected_outcome: str
    status: str
    assumptions: list[str] = []
    alternatives: list[str] = []
    constraints: list[str] = []


class ProposalPayload(BaseModel):
    title: str
    context: str
    proposal: str


class OutcomePayload(BaseModel):
    decision_id: str
    observed_at: str
    outcome: str
    observations: list[str] = []
    lessons: list[str] = []


class QuestionPayload(BaseModel):
    question: str


def _memory_error() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={"error": "MEMORY_SERVICE_UNAVAILABLE"},
    )


@app.exception_handler(HTTPException)
async def http_error_handler(_request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "VALIDATION_ERROR"},
    )


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    _request: Request, _exc: RequestValidationError
):
    return JSONResponse(status_code=422, content={"error": "VALIDATION_ERROR"})

@app.get("/api/health")
def health():
    return {"status": "healthy", "memory": MEMORY_MODE}


@app.post("/api/decisions")
def create_decision(payload: DecisionPayload):
    try:
        return memory_engine.record_decision(payload.model_dump())
    except Exception:
        raise _memory_error() from None


@app.post("/api/analyze")
def analyze_proposal(payload: ProposalPayload):
    try:
        result = memory_engine.analyze_proposal(payload.model_dump())
    except Exception:
        raise _memory_error() from None

    # Keep the engine response intact. The current frontend also consumes an
    # `analysis` view, populated only from Hindsight's actual reflection.
    reflection = result.get("reflection")
    analysis: dict[str, Any] | None = None
    if isinstance(reflection, dict) and reflection.get("status") == "completed":
        analysis = {
            "historical_reasoning": reflection.get("text"),
            "evidence": [
                item.get("content")
                for item in result.get("historical_decisions", [])
                if item.get("content")
            ],
        }

    return {**result, "analysis": analysis}


@app.post("/api/outcomes")
def record_outcome(payload: OutcomePayload):
    try:
        return memory_engine.record_outcome(payload.model_dump())
    except Exception:
        raise _memory_error() from None


@app.post("/api/ask")
def ask_question(payload: QuestionPayload):
    try:
        memories = [
            memory_engine._normalize_recall_result(item)
            for item in memory_engine.recall(payload.question)
        ]
        evidence = memory_engine._format_recalled_memories(memories)
        reflection = memory_engine._normalize_reflection_result(
            memory_engine.reflect(
                f"Answer this question using only organizational decision memory.\n"
                f"Question: {payload.question}\n\n"
                f"Recalled evidence:\n{evidence}\n\n"
                "If the evidence does not answer the question, say what is unknown."
            )
        )
    except Exception:
        raise _memory_error() from None

    if reflection.get("status") != "completed" or not reflection.get("text"):
        raise _memory_error()

    return {
        "answer": reflection["text"],
        "related_decisions": memories,
    }
