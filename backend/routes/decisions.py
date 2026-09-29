from fastapi import APIRouter

from memory_engine import EngineDep
from schemas import DecisionRequest, RetainAckResponse

router = APIRouter(prefix="/api", tags=["decisions"])


@router.post("/decisions", response_model=RetainAckResponse)
async def record_decision(body: DecisionRequest, engine: EngineDep) -> RetainAckResponse:
    return await engine.record_decision(body)
