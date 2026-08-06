"""POST /api/v1/parse — 解析用户需求。"""

from fastapi import APIRouter

from ..models.schemas import ParseRequest, ParseResponse
from ..services.llm_service import LLMService

router = APIRouter()


@router.post("/api/v1/parse", response_model=ParseResponse)
async def parse_requirements(req: ParseRequest):
    llm = LLMService()
    params = llm.parse_requirements(req.text)
    return ParseResponse(params=params)
