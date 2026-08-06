"""多场景推荐质量测试：验证解析 + 推荐对不同需求的效果。"""

import httpx

BASE = "http://127.0.0.1:8000"

QUERIES = [
    "我要做一个低功耗蓝牙温湿度传感器，用电池供电，需要工作半年以上，最好能用I2C接口，预算50元以内",
    "电赛智能小车，需要电机驱动、红外避障、蓝牙遥控、OLED显示，12V电池供电",
    "可穿戴心率监测手环，用蓝牙传数据到手机，电池供电至少一周",
    "做一个空气质量监测站，WiFi连接上传数据，测PM2.5、温湿度和TVOC，USB供电",
    "智能家居环境监测，需要测光照、人体感应和温湿度，用电池供电",
    "做一个LoRa远距离农业环境监测节点，电池供电一年，需要温湿度和土壤湿度传感器",
]


def main() -> None:
    client = httpx.Client(base_url=BASE, timeout=60)
    for q in QUERIES:
        params = client.post("/api/v1/parse", json={"text": q}).json()["params"]
        recs = client.post("/api/v1/recommend", json={"params": params}).json()[
            "recommendations"
        ]
        print(f"需求: {q[:24]}...")
        print(
            "  解析: "
            + " | ".join(
                [
                    params["application"],
                    params["power_supply"] or "-",
                    params["power_consumption"] or "-",
                    ",".join(params["communication"]) or "-",
                    ",".join(params["interface"]) or "-",
                ]
            )
        )
        for r in recs:
            print(f"    {r['part_number']:<22} {r['category']:<6} {r['match_score']}")
        print()


if __name__ == "__main__":
    main()
