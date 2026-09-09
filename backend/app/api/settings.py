"""LLM 设置接口：查看/保存/测试连接。"""

import asyncio
from datetime import datetime

from fastapi import APIRouter

from ..db import db_session
from ..models.schemas import LLMSettingsResponse, LLMSettingsUpdate, LLMTestResponse
from ..services.llm_service import LLMService

router = APIRouter()


def _upsert(conn, key: str, value: str) -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute(
        "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)"
        " ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        (key, value, now),
    )


@router.get("/api/v1/settings/llm", response_model=LLMSettingsResponse)
async def get_llm_settings():
    cfg = LLMService._load_llm_settings()
    return LLMSettingsResponse(
        provider=cfg["provider"],
        model=cfg["model"],
        base_url=cfg["base_url"],
        api_key_set=bool(cfg["api_key"]),
    )


@router.put("/api/v1/settings/llm", response_model=LLMSettingsResponse)
async def save_llm_settings(req: LLMSettingsUpdate):
    with db_session() as conn:
        if req.provider is not None:
            _upsert(conn, "llm_provider", req.provider)
        if req.model is not None:
            _upsert(conn, "llm_model", req.model)
        if req.base_url is not None:
            _upsert(conn, "llm_base_url", req.base_url)
        if req.api_key:
            _upsert(conn, "llm_api_key", req.api_key)
    cfg = LLMService._load_llm_settings()
    return LLMSettingsResponse(
        provider=cfg["provider"],
        model=cfg["model"],
        base_url=cfg["base_url"],
        api_key_set=bool(cfg["api_key"]),
    )


@router.post("/api/v1/settings/llm/test", response_model=LLMTestResponse)
async def test_llm_settings(req: LLMSettingsUpdate | None = None):
    cfg = LLMService._load_llm_settings()
    if req is not None:
        if req.provider is not None:
            cfg["provider"] = req.provider
        if req.model is not None:
            cfg["model"] = req.model
        if req.base_url is not None:
            cfg["base_url"] = req.base_url
        if req.api_key:
            cfg["api_key"] = req.api_key
    # 测试连接（本地/云端）可能耗时，放入线程池避免阻塞事件循环
    result = await asyncio.to_thread(LLMService().test_connection, cfg)
    return LLMTestResponse(**result)
