"""本地模型混合模式实测：解析完整度 + 推荐结果（文件方式保证中文不乱码）。"""

import json

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

KEYS = ["application", "power_supply", "power_consumption", "communication", "interface", "budget", "duration"]


def main() -> None:
    c = make_client(BASE, 300)
    for q in QUERIES:
        p = c.post("/api/v1/parse", json={"text": q}, timeout=300).json()["params"]
        filled = sum(
            1
            for k in KEYS
            if (isinstance(p[k], list) and p[k]) or (isinstance(p[k], str) and p[k])
        )
        print(f"[解析完成度 {filled}/{len(KEYS)}] {json.dumps({k: p[k] for k in KEYS}, ensure_ascii=True)}")
        recs = c.post("/api/v1/recommend", json={"params": p}, timeout=300).json()["recommendations"]
        print("  推荐:", json.dumps([(r["part_number"], r["category"]) for r in recs], ensure_ascii=True))


if __name__ == "__main__":
    main()
