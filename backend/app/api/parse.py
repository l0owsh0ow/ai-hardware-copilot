"""POST /api/v1/parse — 解析用户需求。"""

import asyncio

from fastapi import APIRouter

from ..models.schemas import ParseRequest, ParseResponse
from ..services.llm_service import LLMService

router = APIRouter()


@router.post("/api/v1/parse", response_model=ParseResponse)
async def parse_requirements(req: ParseRequest):
    llm = LLMService()
    # LLM 调用可能耗时几十秒，放入线程池避免阻塞事件循环
    params, degraded = await asyncio.to_thread(llm.parse_requirements_safe, req.text)
    return ParseResponse(params=params, degraded=degraded)
