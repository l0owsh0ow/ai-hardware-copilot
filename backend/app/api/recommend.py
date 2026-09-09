"""POST /api/v1/recommend — RAG 检索 + 排序推荐。"""

import asyncio

from fastapi import APIRouter

from ..models.schemas import RecommendRequest, RecommendResponse
from ..services.rag_service import recommend

router = APIRouter()


@router.post("/api/v1/recommend", response_model=RecommendResponse)
async def recommend_components(req: RecommendRequest):
    # RAG 检索 + LLM 排序可能较慢，放入线程池避免阻塞事件循环
    recommendations, degraded = await asyncio.to_thread(recommend, req.params)
    return RecommendResponse(recommendations=recommendations, degraded=degraded)
