"""子进程方式调用 Ollama（供后端 local 供应商使用）。

从 stdin 读取 JSON: {"model": ..., "messages": [...], "temperature": ..., "think": false, "keep_alive": "30m"}
输出: 模型回复内容（content）。
"""

import json
import os
import sys
import traceback

import httpx


def main() -> None:
    # 显式按 UTF-8 读取 stdin（避免 Windows 控制台 GBK 解码错乱）
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    url = payload.pop("url", "http://127.0.0.1:11434/v1/chat/completions")
    try:
        resp = httpx.post(url, json=payload, timeout=240)
    except Exception:
        err = traceback.format_exc()
        try:
            with open(os.path.join(os.path.dirname(__file__), "..", "backend", "llm_debug.log"), "a", encoding="utf-8") as f:
                f.write(err + "\n")
        except Exception:
            pass
        raise
    if resp.status_code != 200:
        print(f"__ERROR__ {resp.status_code} {resp.text[:200]}", file=sys.stderr)
        sys.exit(1)
    # 显式按 UTF-8 输出（避免 Windows 控制台 GBK 编码把中文写坏）
    content = resp.json()["choices"][0]["message"]["content"]
    sys.stdout.buffer.write(content.encode("utf-8"))


if __name__ == "__main__":
    main()
