"""安全与运营：API 鉴权、速率限制、请求日志。"""

import logging
import time
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request
from fastapi.responses import JSONResponse

from .config import get_settings

logger = logging.getLogger("hwcopilot")


def require_token(x_api_token: str = Header(default="")) -> None:
    """接口鉴权：请求必须携带 X-API-Token（未配置 API_TOKEN 时跳过）。"""
    settings = get_settings()
    if not settings.api_token:
        return
    if x_api_token != settings.api_token:
        raise HTTPException(status_code=401, detail="无效的 API Token")


# 内存版速率限制（单进程够用；生产建议 Redis）
_hits: dict[str, deque] = defaultdict(deque)


def _check_limit(key: str, limit: int, window: int) -> None:
    now = time.time()
    dq = _hits[key]
    while dq and dq[0] < now - window:
        dq.popleft()
    if len(dq) >= limit:
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
    dq.append(now)


async def rate_limit_middleware(request: Request, call_next):
    """按路径分组限流 + 结构化请求日志。"""
    path = request.url.path
    ip = request.client.host if request.client else "unknown"
    try:
        if path in ("/api/v1/parse", "/api/v1/recommend"):
            _check_limit(f"{ip}:llm", limit=10, window=60)
        elif path.startswith("/api/v1/"):
            _check_limit(f"{ip}:api", limit=120, window=60)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("请求处理异常 %s %s", request.method, path)
        raise
    duration_ms = int((time.time() - start) * 1000)
    logger.info(
        "%s %s -> %s (%dms)",
        request.method,
        path,
        response.status_code,
        duration_ms,
    )
    response.headers["X-RateLimit-Remaining"] = "see-server-log"
    return response
