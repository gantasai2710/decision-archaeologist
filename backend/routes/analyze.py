from fastapi import APIRouter

from memory_engine import EngineDep
from schemas import AnalyzeRequest, AnalyzeResponse

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest, engine: EngineDep) -> AnalyzeResponse:
    return await engine.analyze_proposal(body)
