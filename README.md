# Decision Archaeologist

Decision Archaeologist is an AI-powered architectural decision memory system for software architects. Teams often remember **what** they decided but lose **why** it was reasonable at the time, which assumptions supported it, what alternatives were considered, and what happened afterward.

The system helps teams revisit those decisions when circumstances change and ask:

> “The decision was reasonable then. Is it still reasonable now?”

It provides historical reasoning and evidence for review. The human architect makes the final decision.

## How it works

The product follows a continuous memory loop:

```text
New Decision
     ↓ RETAIN
Persistent Hindsight Memory
     ↓ RECALL
Historical Decisions + Outcomes
     ↓ REFLECT
Changed Assumptions + Implications + Evidence
     ↓
Architect Decides
     ↓
Record Outcome / New Decision
     └────────────── RETAIN
```

In the application, an architect records a decision and later records its outcome and lessons. When a follow-up proposal is analyzed, the backend recalls relevant history and asks Hindsight to reflect on changed assumptions, implications, uncertainties, and evidence. The architect reviews that analysis, decides what to do, and can record the resulting decision and optionally link it to the prior decision.

## Architecture

```text
React + Vite Frontend
          ↓ HTTP/JSON
FastAPI Backend
          ↓
MemoryEngine
          ↓
Hindsight Cloud
```

- **React + Vite frontend:** decision and outcome forms, proposal analysis, and history/detail screens. It communicates with FastAPI and does not call Hindsight directly.
- **FastAPI backend:** validates requests, serves the API, applies CORS settings, and returns errors.
- **MemoryEngine:** coordinates decision and outcome retention, historical recall, and reflection.
- **Hindsight Cloud:** the organizational memory service used for persistent memories and the RETAIN, RECALL, and REFLECT operations.

Hindsight Cloud is the current configuration. This setup does not require local Hindsight Docker. The project does not configure a separate database, vector database, or AI provider.

## Technology stack

- React 18 and Vite
- Tailwind CSS
- FastAPI and Pydantic
- Python
- Hindsight Cloud (`hindsight-client` 0.10.1)
- Node.js and npm

## Prerequisites

- Python 3.10 or newer
- Node.js and npm
- A Hindsight Cloud account, a memory bank, and your own API key

The configured bank ID is `decision-arch`. Docker is not required for the current Cloud setup.

## Clone the repository

In Windows PowerShell:

```powershell
git clone https://github.com/gantasai2710/decision-archaeologist.git
cd decision-archaeologist
```

## Backend setup

In a PowerShell terminal from the repository root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and configure it with your own Hindsight Cloud API key. The checked-in `backend/.env.example` documents these settings:

```dotenv
MEMORY_MODE=hindsight
HINDSIGHT_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=<your Hindsight Cloud API key>
HINDSIGHT_BANK_ID=decision-arch
CORS_ORIGINS=http://localhost:5173
HINDSIGHT_TIMEOUT_SECONDS=240
HINDSIGHT_RECALL_BUDGET=mid
HINDSIGHT_REFLECT_BUDGET=low
HINDSIGHT_AUTO_CREATE_BANK=false
```

Obtain an API key from your Hindsight Cloud account and put it only in `backend/.env`. Never commit that file or share its contents. The configured bank already exists, so automatic bank creation is disabled by default.

Start the backend from the `backend` directory:

```powershell
uvicorn server:app --reload --port 8000
```

The API documentation is available at `http://localhost:8000/docs` and its health endpoint at `http://localhost:8000/api/health`.

## Frontend setup

Open a second PowerShell terminal from the repository root:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

`frontend/.env.example` sets the API connection and real API mode:

```dotenv
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How the processes connect

```text
Browser :5173
     ↓ HTTP/JSON
FastAPI :8000
     ↓
Hindsight Cloud
```

The backend allows `http://localhost:5173` through its `CORS_ORIGINS` setting. The browser only connects to FastAPI. The Hindsight API key remains on the backend and is never sent to or bundled into the frontend.

## Core API routes

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Report whether the memory service is reachable. |
| `POST /api/decisions` | Retain a decision and its reasoning; optional follow-up fields can link it to an earlier decision. |
| `POST /api/analyze` | Recall relevant history and reflect on it alongside a proposal. |
| `POST /api/outcomes` | Retain what happened, observations, and lessons for a decision. |
| `POST /api/ask` | Recall history and reflect to answer a question about it. |

## Project structure

```text
decision-archaeologist/
├── backend/
│   ├── routes/                 FastAPI route modules
│   ├── tests/                  Backend unit and integration tests
│   ├── .env.example            Backend configuration template
│   ├── hindsight_adapter.py    Hindsight client adapter
│   ├── memory_engine.py        RETAIN, RECALL, and REFLECT coordination
│   ├── schemas.py              Request and response models
│   ├── server.py               FastAPI application and settings
│   └── requirements*.txt       Python dependencies
├── docs/
│   ├── API_CONTRACT.md         API contract notes
│   └── ARCHITECTURE.md         Architecture notes
└── frontend/
    ├── src/                    React application source
    ├── .env.example            Frontend configuration template
    └── package.json            npm scripts and dependencies
```

## Data and history: current MVP limitation

The backend does not currently expose decision read endpoints. To support the History and Detail screens, the frontend maintains a small browser-local index of decisions successfully created through this UI.

That browser index is only a UI convenience; it is **not** the persistent organizational memory. It is not shared between browsers, and older records already stored in Hindsight are not automatically imported into it. Hindsight remains the memory service used by the backend for persistent organizational memories, recall, reflection, outcomes, and follow-up relationships.

## Testing

Run the backend unit tests from the `backend` directory:

```powershell
cd backend
pytest
```

The current validated test result is **32 passed, 1 skipped**. The unit tests use a fake memory adapter; the Cloud integration test is separately opt-in and makes real Hindsight requests.

Build the frontend from the `frontend` directory:

```powershell
cd frontend
npm run build
```

The frontend production build has been validated.

## Security notes

- Keep Hindsight credentials in `backend/.env` only.
- The frontend communicates with FastAPI, not directly with Hindsight, and never receives the Hindsight API key.
- Do not commit `.env` files containing secrets. Use the checked-in `.env.example` files as templates.

## Project status

Decision Archaeologist is a working hackathon MVP demonstrating persistent architectural decision memory. It preserves not only what was decided, but why it was reasonable at the time, what happened afterward, and whether the original assumptions still hold.

**RETAIN → RECALL → REFLECT → Architect decides → RETAIN**
