"""FastAPI 入口。"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import bom, components, history, parse, recommend
from .api import settings as settings_api
from .config import get_settings
from .db import init_db

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


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "hardware-copilot-api"}


app.include_router(parse.router)
app.include_router(recommend.router)
app.include_router(bom.router)
app.include_router(components.router)
app.include_router(history.router)
app.include_router(settings_api.router)
