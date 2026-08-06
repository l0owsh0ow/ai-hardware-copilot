"""POST /api/v1/recommend — RAG 检索 + 排序推荐。"""

from fastapi import APIRouter

from ..models.schemas import RecommendRequest, RecommendResponse
from ..services.rag_service import recommend

router = APIRouter()


@router.post("/api/v1/recommend", response_model=RecommendResponse)
async def recommend_components(req: RecommendRequest):
    recommendations = recommend(req.params)
    return RecommendResponse(recommendations=recommendations)
