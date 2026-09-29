from fastapi import APIRouter

from memory_engine import EngineDep
from schemas import AskRequest, AskResponse

router = APIRouter(prefix="/api", tags=["ask"])


@router.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest, engine: EngineDep) -> AskResponse:
    return await engine.ask_question(body)
