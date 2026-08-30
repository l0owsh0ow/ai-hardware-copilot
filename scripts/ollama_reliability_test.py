"""Ollama /v1 接口可靠性测试：连续多次调用，检查是否有间歇 502。"""

import time

import httpx

URL = "http://127.0.0.1:11434/v1/chat/completions"


def main() -> None:
    payload = {
        "model": "qwen3:4b",
        "messages": [
            {
                "role": "system",
                "content": "你是一个专业的硬件选型助手。请始终使用简体中文回答。严格遵守输出格式要求：只输出 JSON，不要输出任何多余文字，不要使用 Markdown 代码块包裹。",
            },
            {"role": "user", "content": "请只回复两个字：正常"},
        ],
        "temperature": 0.2,
        "think": False,
        "keep_alive": "30m",
    }
    ok = 0
    for i in range(5):
        t0 = time.time()
        try:
            r = httpx.post(URL, json=payload, timeout=120)
            cost = time.time() - t0
            if r.status_code == 200:
                ok += 1
                print(f"[{i + 1}] 200 ({cost:.1f}s) {r.json()['choices'][0]['message']['content'][:30]!r}")
            else:
                print(f"[{i + 1}] {r.status_code} ({cost:.1f}s) {r.text[:80]}")
        except Exception as exc:
            print(f"[{i + 1}] 异常: {str(exc)[:100]}")
    print(f"结果: {ok}/5 成功")


if __name__ == "__main__":
    main()
