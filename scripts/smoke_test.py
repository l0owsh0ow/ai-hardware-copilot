"""端到端冒烟测试：parse → recommend → bom → export → search → detail。

用法: python scripts/smoke_test.py [BASE_URL]
输出使用 ensure_ascii，避免终端编码问题。
"""

import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"

SAMPLE = (
    "我要做一个低功耗蓝牙温湿度传感器，用电池供电，需要工作半年以上，"
    "最好能用I2C接口，预算50元以内"
)


def show(label: str, obj) -> None:
    import json

    text = json.dumps(obj, ensure_ascii=True, indent=2)
    print(f"== {label} ==")
    print(text[:1500])
    print()


def main() -> None:
    client = httpx.Client(base_url=BASE, timeout=60)

    resp = client.post("/api/v1/parse", json={"text": SAMPLE})
    resp.raise_for_status()
    params = resp.json()["params"]
    show("PARSE", params)

    resp = client.post("/api/v1/recommend", json={"params": params})
    resp.raise_for_status()
    recommendations = resp.json()["recommendations"]
    show(
        "RECOMMEND",
        [
            {
                "part_number": r["part_number"],
                "category": r["category"],
                "match_score": r["match_score"],
                "price_cny": r["price_cny"],
                "datasheet_url": r["datasheet_url"],
            }
            for r in recommendations
        ],
    )

    selections = [
        {"part_number": r["part_number"], "quantity": 1}
        for r in recommendations[:4]
    ]
    resp = client.post(
        "/api/v1/bom/generate",
        json={"selections": selections, "project_name": "低功耗蓝牙温湿度传感器"},
    )
    resp.raise_for_status()
    bom = resp.json()["bom"]
    show(
        "BOM",
        {
            "id": bom["id"],
            "project_name": bom["project_name"],
            "total_cost": bom["total_cost"],
            "items": [i["part_number"] for i in bom["items"]],
        },
    )

    csv_resp = client.get(f"/api/v1/bom/{bom['id']}/export?format=csv")
    print(f"== EXPORT CSV == status={csv_resp.status_code} bytes={len(csv_resp.content)}")
    print()
    csv_qty_resp = client.get(
        f"/api/v1/bom/{bom['id']}/export?format=csv&quantities=STM32L432KC:2"
    )
    print(
        "== EXPORT CSV (qty override) =="
        f" status={csv_qty_resp.status_code} has_qty2={'STM32L432KC,2' in csv_qty_resp.text}"
    )
    print()
    xlsx_resp = client.get(f"/api/v1/bom/{bom['id']}/export?format=excel")
    print(
        f"== EXPORT EXCEL == status={xlsx_resp.status_code} bytes={len(xlsx_resp.content)}"
    )
    print()

    resp = client.get("/api/v1/components/search", params={"q": "蓝牙", "category": "mcu"})
    resp.raise_for_status()
    show("SEARCH 蓝牙/mcu", [r["part_number"] for r in resp.json()["results"]])

    resp = client.get("/api/v1/components/mcu-stm32l432kc")
    resp.raise_for_status()
    detail = resp.json()["component"]
    show(
        "DETAIL",
        {
            "part_number": detail["part_number"],
            "supplier": detail["supplier"],
            "datasheet_url": detail["datasheet_url"],
            "tags": detail["tags"],
        },
    )

    print("SMOKE TEST PASSED")


if __name__ == "__main__":
    main()
