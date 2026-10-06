# Decision Archaeologist

React + Vite frontend and FastAPI backend for architectural decision memory.

## Connect and run locally

The frontend is configured to use the backend at `http://localhost:8000` with mock data disabled.

1. Configure and start the backend in one terminal:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements-dev.txt
   Copy-Item .env.example .env
   # Set HINDSIGHT_API_KEY in backend/.env
   uvicorn server:app --reload --port 8000
   ```

2. Configure and start the frontend in another terminal:

   ```powershell
   cd frontend
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`.

Hindsight credentials belong only in `backend/.env`; the frontend never receives them. The backend allows `http://localhost:5173` by default. If Vite uses another port, add that origin to `CORS_ORIGINS` in `backend/.env`.

## Data and history

The frontend's `frontend/.env.example` sets `VITE_USE_MOCK=false` and `VITE_API_URL=http://localhost:8000`. Copy it to `frontend/.env` for local development. Restart Vite after changing these values.

The backend currently supports health, decision and outcome writes, proposal analysis, and questions. It does not expose decision read endpoints. To keep the history and detail screens usable, the frontend keeps a small browser-local index of decisions successfully created through this UI. Hindsight remains the memory service used by the backend for recall and analysis. The browser index is not shared between browsers and does not import older records retained directly in Hindsight.

For backend setup details and API examples, see [backend/README.md](backend/README.md).
