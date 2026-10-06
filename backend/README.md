# Decision Archaeologist – Backend

Decision-memory backend for software architects. When a new architectural proposal comes in, it pulls up the relevant past decisions and checks whether the assumptions behind them still hold. It gives evidence, not verdicts: the architect makes the call.

```
Frontend --HTTP/JSON--> FastAPI --> MemoryEngine --> HindsightAdapter --> Hindsight Cloud
                                                                           |- RETAIN  (decisions, outcomes, lessons)
                                                                           |- RECALL  (relevant history)
                                                                           '- REFLECT (assumption-change analysis)
```

Hindsight Cloud is the only persistence and the only AI layer. No other database, vector store or LLM is used here.

## Prerequisites

- Python 3.10+ (developed on 3.12)
- A Hindsight Cloud account with a memory bank and API key

## 1. Hindsight Cloud setup

1. Sign up / log in at https://ui.hindsight.vectorize.io and pick your organization (apply the hackathon credits there).
2. Create a memory bank with the ID `decision-arch`.
3. Create an API key for the backend.
4. Put the key only in `backend/.env` (next step). Never in frontend code, never in git.

The Cloud API is `https://api.hindsight.vectorize.io`; the key is sent as a Bearer token by the official `hindsight-client`.

## 2. Install and configure

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env               # Windows: copy .env.example .env
```

Edit `.env` and set `HINDSIGHT_API_KEY`.

| Variable | Default | Notes |
|---|---|---|
| `MEMORY_MODE` | `hindsight` | Only value supported |
| `HINDSIGHT_URL` | `https://api.hindsight.vectorize.io` | |
| `HINDSIGHT_API_KEY` | none | Required for Cloud. Secret. |
| `HINDSIGHT_BANK_ID` | `decision-arch` | |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated frontend origins |
| `HINDSIGHT_RECALL_BUDGET` | `mid` | `low` / `mid` / `high` |
| `HINDSIGHT_REFLECT_BUDGET` | `low` | `low` / `mid` / `high`; raise if analysis is too shallow |
| `HINDSIGHT_TIMEOUT_SECONDS` | `240` | |
| `HINDSIGHT_AUTO_CREATE_BANK` | `false` | Leave off on Cloud |

Frontend: `VITE_API_URL=http://localhost:8000` (no Hindsight credentials, ever).

## 3. Verify Hindsight (do this once)

```bash
python verify_hindsight.py
```

It checks the connection, then RETAINs DEC-005, RECALLs it, and runs one REFLECT. That is about one retain, one recall and one reflect, so it barely touches your credits. Re-running it updates DEC-005 instead of duplicating it.

## 4. Run the backend

```bash
uvicorn server:app --port 8000 --reload
```

- Swagger docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## API

All errors look like `{"error": "CODE", "message": "..."}`. Validation failures are 400, Hindsight problems are 503, anything unexpected is 500. Nothing sensitive is ever included.

| Endpoint | What it does |
|---|---|
| `GET /api/health` | `{"status":"healthy","memory":"hindsight"}` or `{"status":"degraded","memory":"unavailable"}` |
| `POST /api/decisions` | RETAIN a decision with its full reasoning |
| `POST /api/analyze` | RECALL history, then REFLECT against the new proposal |
| `POST /api/outcomes` | RETAIN what happened and the lessons |
| `POST /api/ask` | RECALL, then REFLECT to answer a history question |

Note: `/api/health` checks that Hindsight is reachable. A wrong API key can still show `healthy`, but the first retain/recall returns 503. `verify_hindsight.py` catches that.

### Analyze statuses

- `analyzed`: recall and reflect both worked.
- `recalled`: reflect failed. Recalled memories are returned, `analysis` is `null`, nothing is made up.
- `no_relevant_memory`: nothing relevant in memory, so reflect isn't called.

### Examples

```bash
curl localhost:8000/api/health

curl -X POST localhost:8000/api/decisions -H 'Content-Type: application/json' -d '{
  "decision_id": "DEC-005",
  "title": "Use synchronous processing",
  "context": "Small workload.",
  "problem": "Incoming events need processing.",
  "chosen_option": "Process synchronously in the request",
  "rationale": "Small workload, simple implementation, easy debugging.",
  "assumptions": ["Processing remains short", "Request volume remains manageable"],
  "alternatives": [],
  "constraints": [],
  "expected_outcome": "Simple, debuggable system",
  "status": "active"}'

curl -X POST localhost:8000/api/analyze -H 'Content-Type: application/json' -d '{
  "title": "Move processing to background workers",
  "context": "Event volume has increased. Some operations now take several seconds.",
  "proposal": "Use background workers."}'

curl -X POST localhost:8000/api/outcomes -H 'Content-Type: application/json' -d '{
  "decision_id": "DEC-006",
  "observed_at": "2026-10-15",
  "outcome": "Average API response time decreased.",
  "observations": ["Infrastructure costs increased"],
  "lessons": ["Asynchronous processing helps with long-running tasks"]}'

curl -X POST localhost:8000/api/ask -H 'Content-Type: application/json' \
  -d '{"question": "Why did we originally choose synchronous processing?"}'
```

Analyze response shape:

```json
{
  "status": "analyzed",
  "proposal": {"title": "...", "context": "...", "proposal": "..."},
  "historical_decisions": [{"content": "...", "metadata": {"decision_id": "DEC-005"}, "relevance_score": 0.91}],
  "analysis": {
    "historical_reasoning": "...",
    "changed_conditions": [],
    "changed_assumptions": [],
    "assumption_assessments": [
      {"original_assumption": "...", "current_condition": "...", "assessment": "changed", "explanation": "..."}
    ],
    "implications": [],
    "uncertainties": [],
    "evidence": []
  },
  "message": null
}
```

## How RETAIN / RECALL / REFLECT are used

- **RETAIN**: `/decisions` and `/outcomes` write the full record (context, problem, rationale, assumptions, alternatives, constraints, expected outcome; or outcome, observations, lessons). The decision id is the `document_id`, so re-posting a decision updates it instead of duplicating it. Tags like `decision:DEC-005` link outcomes back to decisions.
- **RECALL**: `/analyze` builds a query from the proposal title, context and text; `/ask` uses the question.
- **REFLECT**: the recalled history plus the current proposal go to Hindsight's reflect with a JSON schema, so the assumption-vs-current-condition comparison is generated by Hindsight, not hard-coded. The prompt tells it not to recommend a decision.

## Tests

```bash
pytest                                                    # unit tests, Hindsight mocked, costs nothing
HINDSIGHT_INTEGRATION=1 pytest tests/test_integration.py  # integration: real Cloud, spends a few credits
```

Unit tests cover health, valid/invalid decisions and outcomes, analyze (success, no memories, reflect down, recall down), ask, Hindsight-down 503s, CORS, the 500 path, secret leakage, and that the Cloud settings reach the client.

## Saving credits

- Analyze (RECALL + REFLECT) only runs when the user clicks Analyze. Don't call it on typing or on a timer. The backend never reflects in the background.
- Develop against `pytest` (mocked). Use the real Cloud for `verify_hindsight.py` and the final demo.
- Reflect budget defaults to `low`. Retries are off, so a failed paid call is never silently repeated.
- Decisions and outcomes use stable ids, so repeated submits update rather than pile up duplicate memories.
- `python demo.py` makes about 5 writes and 2 reflects. Fine for rehearsal, but don't loop it.

## Troubleshooting

- **`degraded` on /api/health**: Cloud unreachable. Check your internet and `HINDSIGHT_URL`.
- **503 on decisions/analyze but health is healthy**: usually a wrong or expired API key, or a bank id mismatch. Run `python verify_hindsight.py`.
- **Recall returns nothing right after retain**: Hindsight may still be processing; wait a minute and retry.
- **Analyze is slow or times out**: reflect runs an LLM; raise `HINDSIGHT_TIMEOUT_SECONDS`.
- **Browser CORS error**: add your frontend origin to `CORS_ORIGINS`.
- **`ModuleNotFoundError`**: run commands from inside `backend/` with the venv active.

## Demo flow

1. Run `python demo.py`, or do it by hand in Swagger (/docs):
2. POST `/api/decisions` with DEC-005 (RETAIN the old decision).
3. POST `/api/analyze` with "Move processing to background workers" (RECALL finds DEC-005, REFLECT compares its assumptions with today's conditions).
4. The architect reads the changed assumptions, implications and uncertainties, then decides.
5. POST `/api/decisions` with DEC-006.
6. Later, POST `/api/outcomes` with what happened and the lessons (RETAIN).
7. Future analyses can now recall the outcome and lessons too.

## Structure

```
backend/
  server.py             app, CORS, error handlers
  schemas.py            Pydantic models
  memory_engine.py      memory logic + prompts
  hindsight_adapter.py  only file that talks to Hindsight
  local_memory.py       tiny in-process title cache (not a store)
  routes/               health, decisions, analyze, outcomes, ask
  tests/                unit + integration tests
  demo.py               end-to-end demo script
  verify_hindsight.py   one-shot Cloud connectivity check
```
