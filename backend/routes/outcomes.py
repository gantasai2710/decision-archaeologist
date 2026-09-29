from fastapi import APIRouter

from memory_engine import EngineDep
from schemas import OutcomeRequest, RetainAckResponse

router = APIRouter(prefix="/api", tags=["outcomes"])


@router.post("/outcomes", response_model=RetainAckResponse)
async def record_outcome(body: OutcomeRequest, engine: EngineDep) -> RetainAckResponse:
    return await engine.record_outcome(body)
