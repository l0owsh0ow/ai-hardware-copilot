"""本地模型 vs 云端模型 质量对比测试。

使用当前个人主页配置的 LLM 供应商（切换供应商后再跑即可对比）。

用法:
    python scripts/local_model_quality_test.py [标签]

示例:
    python scripts/local_model_quality_test.py DeepSeek基线
    # 切换到本地模型后:
    python scripts/local_model_quality_test.py 本地Qwen3-4B
"""

import sys
import time

from api_client import make_client

BASE = "http://127.0.0.1:8000"

QUERIES = [
    "我要做一个低功耗蓝牙温湿度传感器，用电池供电，需要工作半年以上，最好能用 I2C 接口，预算 50 元以内",
    "电赛智能小车，需要电机驱动、红外避障、蓝牙遥控、OLED 显示，12V 电池供电",
    "可穿戴心率监测手环，用蓝牙传数据到手机，电池供电至少一周",
    "做一个空气质量监测站，WiFi 连接上传数据，测 PM2.5、温湿度和 TVOC，USB 供电",
    "智能家居环境监测，需要测光照、人体感应和温湿度，用电池供电",
    "做一个 LoRa 远距离农业环境监测节点，电池供电一年，需要温湿度和土壤湿度传感器",
]


def main() -> None:
    label = sys.argv[1] if len(sys.argv) > 1 else "当前配置"
    client = make_client(BASE, 240)
    ok = total = 0
    latencies = []

    print(f"== 质量对比测试：{label} ==")
    for q in QUERIES:
        total += 1
        t0 = time.time()
        try:
            p = client.post("/api/v1/parse", json={"text": q}).json()["params"]
            recs = client.post("/api/v1/recommend", json={"params": p}).json()["recommendations"]
            lat = time.time() - t0
            ok += 1
            latencies.append(lat)
            print(f"[OK] {q[:16]}... {lat:.1f}s | 推荐 {len(recs)} 个")
            print(
                f"  解析: {p['application'] or '-'} | 通信: {','.join(p['communication']) or '-'}"
                f" | 接口: {','.join(p['interface']) or '-'}"
            )
            print(f"  推荐: {', '.join(r['part_number'] for r in recs) or '(空)'}")
        except Exception as exc:
            print(f"[FAIL] {q[:16]}... {str(exc)[:120]}")

    avg = sum(latencies) / max(len(latencies), 1)
    print(f"== 汇总: 成功 {ok}/{total} | 平均耗时 {avg:.1f}s ==")
    if ok == total:
        print("结论: 当前配置全部场景可用，可作为对比基线。")
    else:
        print("结论: 有失败场景，请检查日志或供应商配置。")


if __name__ == "__main__":
    main()
