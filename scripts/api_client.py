"""测试脚本共用的 API 客户端（自动读取 backend/.env 的 API_TOKEN）。"""

import os
import sys

import httpx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(ROOT, "backend", ".env"))
except Exception:
    pass

API_TOKEN = os.getenv("API_TOKEN", "")
HEADERS = {"X-API-Token": API_TOKEN} if API_TOKEN else {}


def make_client(base: str, timeout: float = 60) -> httpx.Client:
    return httpx.Client(base_url=base, timeout=timeout, headers=HEADERS)
