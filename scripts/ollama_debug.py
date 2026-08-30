"""用后端完全相同的请求体直连 Ollama，打印 502 的响应体详情。"""

import os
import sys

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.services.llm_service import SYSTEM_PROMPT

payload = {
    "model": "qwen3:4b",
    "messages": [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "请只回复两个字：正常"},
    ],
    "temperature": 0.2,
    "think": False,
    "keep_alive": "30m",
}

for url in [
    "http://127.0.0.1:11434/v1/chat/completions",
    "http://localhost:11434/v1/chat/completions",
]:
    r = httpx.post(url, json=payload, timeout=120)
    print(f"URL: {url}")
    print(f"  status: {r.status_code}")
    print(f"  headers: {dict(r.headers)}")
    print(f"  body: {r.text[:300]!r}")
