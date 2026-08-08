"""全局配置：从环境变量 / .env 读取，统一在此管理。"""

import os
from functools import lru_cache

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))


@lru_cache
def get_settings():
    return Settings()


class Settings:
    """应用配置（简单 dataclass 风格，避免额外依赖 pydantic-settings）。"""

    def __init__(self):
        self.llm_api_key: str = os.getenv("LLM_API_KEY", "")
        self.llm_model: str = os.getenv("LLM_MODEL", "claude-sonnet-4-20250514")
        # claude / openai / deepseek / mock
        self.llm_provider: str = os.getenv("LLM_PROVIDER", "mock").strip().lower()
        self.database_path: str = os.getenv("DATABASE_PATH", "./data/components.db")
        self.chroma_path: str = os.getenv("CHROMA_PATH", "./data/chroma")
        self.embedding_model: str = os.getenv(
            "EMBEDDING_MODEL",
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        )
        self.rag_top_k: int = int(os.getenv("RAG_TOP_K", "30"))
        self.rag_max_recommendations: int = int(os.getenv("RAG_MAX_RECOMMENDATIONS", "5"))
        self.cors_origins: list[str] = [
            o.strip()
            for o in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:3000,http://localhost:3001",
            ).split(",")
            if o.strip()
        ]

    def resolve_database_path(self) -> str:
        """将相对路径解析到 backend 目录下，便于不同启动位置使用。"""
        if os.path.isabs(self.database_path):
            return self.database_path
        return os.path.join(BASE_DIR, self.database_path)

    def resolve_chroma_path(self) -> str:
        if os.path.isabs(self.chroma_path):
            return self.chroma_path
        return os.path.join(BASE_DIR, self.chroma_path)
