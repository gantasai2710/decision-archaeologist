from fastapi import APIRouter

from memory_engine import EngineDep
from schemas import HealthResponse

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(engine: EngineDep) -> HealthResponse:
    if await engine.health_check():
        return HealthResponse(status="healthy", memory="hindsight")
    return HealthResponse(status="degraded", memory="unavailable")
