"""FastAPI application entry point. Run with: uvicorn server:app --port 8000"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from hindsight_adapter import HindsightAdapter, MemoryServiceError
from memory_engine import MemoryEngine
from routes import analyze, ask, decisions, health, outcomes

load_dotenv(Path(__file__).parent / ".env")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("decision_archaeologist")


@dataclass(frozen=True)
class Settings:
    memory_mode: str
    hindsight_url: str
    bank_id: str
    api_key: Optional[str]
    timeout: float
    cors_origins: list[str]
    recall_budget: str
    reflect_budget: str
    auto_create_bank: bool

    @staticmethod
    def from_env() -> "Settings":
        origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
        return Settings(
            memory_mode=os.getenv("MEMORY_MODE", "hindsight"),
            hindsight_url=os.getenv("HINDSIGHT_URL", "https://api.hindsight.vectorize.io"),
            bank_id=os.getenv("HINDSIGHT_BANK_ID", "decision-arch"),
            api_key=os.getenv("HINDSIGHT_API_KEY") or None,
            timeout=float(os.getenv("HINDSIGHT_TIMEOUT_SECONDS", "90")),
            cors_origins=[o.strip() for o in origins.split(",") if o.strip()],
            recall_budget=os.getenv("HINDSIGHT_RECALL_BUDGET", "mid"),
            reflect_budget=os.getenv("HINDSIGHT_REFLECT_BUDGET", "low"),
            auto_create_bank=os.getenv("HINDSIGHT_AUTO_CREATE_BANK", "false").lower() == "true",
        )


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": code, "message": message})


def _register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Only field paths + messages; never echo the submitted input back.
        parts = [f"{'.'.join(str(p) for p in e['loc'][1:]) or 'body'}: {e['msg']}" for e in exc.errors()]
        return _error(400, "VALIDATION_ERROR", "; ".join(parts))

    @app.exception_handler(MemoryServiceError)
    async def memory_error(_: Request, exc: MemoryServiceError) -> JSONResponse:
        return _error(503, exc.code, exc.public_message)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
        return _error(exc.status_code, code, str(exc.detail))

    @app.exception_handler(Exception)
    async def unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled error: %s", type(exc).__name__, exc_info=exc)
        return _error(500, "INTERNAL_ERROR", "An unexpected error occurred.")


def create_app(adapter: Optional[HindsightAdapter] = None) -> FastAPI:
    settings = Settings.from_env()
    if settings.memory_mode != "hindsight":
        raise RuntimeError("MEMORY_MODE must be 'hindsight'; no other memory backend is supported.")
    if adapter is None:
        if not settings.api_key and "localhost" not in settings.hindsight_url:
            logger.warning("HINDSIGHT_API_KEY is not set; Hindsight Cloud will reject requests.")
        adapter = HindsightAdapter(
            base_url=settings.hindsight_url,
            bank_id=settings.bank_id,
            api_key=settings.api_key,
            timeout=settings.timeout,
            recall_budget=settings.recall_budget,
            reflect_budget=settings.reflect_budget,
        )
    engine = MemoryEngine(adapter)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await engine.startup(settings.auto_create_bank)
        yield
        await engine.shutdown()

    app = FastAPI(title="Decision Archaeologist API", version="1.0.0", lifespan=lifespan)
    app.state.engine = engine

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    _register_error_handlers(app)
    for module in (health, decisions, analyze, outcomes, ask):
        app.include_router(module.router)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000)
