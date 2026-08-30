"""FastAPI 入口。"""

import logging

from fastapi import FastAPI
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware

from .api import bom, components, history, parse, recommend
from .api import settings as settings_api
from .config import get_settings
from .db import init_db
from .security import rate_limit_middleware, require_token

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(
    title="AI硬件选型助手 API",
    description="HardwareCopilot - 自然语言硬件选型 + RAG 推荐 + BOM 生成",
    version="0.1.0",
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(rate_limit_middleware)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "hardware-copilot-api"}


app.include_router(parse.router, dependencies=[Depends(require_token)])
app.include_router(recommend.router, dependencies=[Depends(require_token)])
app.include_router(bom.router, dependencies=[Depends(require_token)])
app.include_router(components.router, dependencies=[Depends(require_token)])
app.include_router(history.router, dependencies=[Depends(require_token)])
app.include_router(settings_api.router, dependencies=[Depends(require_token)])
