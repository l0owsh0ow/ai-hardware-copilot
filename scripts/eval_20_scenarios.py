"""20 场景评估集：覆盖课程设计/电赛/毕设常见需求。

用法: python scripts/eval_20_scenarios.py
输出: 每场景 解析完成度 + 推荐数量；结尾汇总成功率与平均耗时。
"""

import json
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
    "做一个 NFC 门禁系统，用 RC522 读卡器，STC 单片机控制电磁锁，5V 供电",
    "四轴无人机飞控，需要九轴传感器和 PWM 电机输出，电池供电",
    "平衡小车，需要陀螺仪和加速度计，两个直流电机，12V 电池",
    "做一个土壤湿度检测仪，用 Arduino 读取湿度传感器，OLED 显示，电池供电",
    "PM2.5 检测仪，用激光粉尘传感器，串口输出数据到上位机，USB 供电",
    "智能电表项目，需要交流电压电流测量和电能计量，Modbus 上报",
    "做一个电子秤，用 HX711 称重传感器，LCD1602 显示，5V 供电",
    "智能门锁，用指纹模块和舵机，蓝牙手机开锁，锂电池供电",
    "小型气象站，测温度湿度气压风速，太阳能供电，LoRa 上报",
    "智能灯泡，用 WiFi 控制 RGB 灯带，手机 APP 调节颜色亮度",
    "做一个太阳能充电器，给 3.7V 锂电池充电，带电量显示",
    "室内定位小车，用蓝牙信标测距，OLED 显示坐标",
    "宠物喂食器，定时电机出粮，WiFi 远程控制，5V 供电",
    "做一个智能鱼缸，测水温 pH 值，定时喂食和换水提醒",
]

KEYS = ["application", "power_supply", "communication", "interface"]


def main() -> None:
    client = make_client(BASE, 300)
    ok = total = 0
    latencies = []
    for q in QUERIES:
        total += 1
        t0 = time.time()
        try:
            p = client.post("/api/v1/parse", json={"text": q}, timeout=300).json()["params"]
            recs = client.post("/api/v1/recommend", json={"params": p}, timeout=300).json()["recommendations"]
            filled = sum(1 for k in KEYS if (isinstance(p[k], list) and p[k]) or (isinstance(p[k], str) and p[k]))
            lat = time.time() - t0
            ok += 1
            latencies.append(lat)
            print(f"[OK {filled}/{len(KEYS)}] {q[:14]}... {lat:.1f}s | {len(recs)}个: {', '.join(r['part_number'] for r in recs[:4])}")
        except Exception as exc:
            print(f"[FAIL] {q[:14]}... {str(exc)[:100]}")
    avg = sum(latencies) / max(len(latencies), 1)
    print(f"\n== 汇总: 成功 {ok}/{total} | 平均耗时 {avg:.1f}s ==")


if __name__ == "__main__":
    main()
