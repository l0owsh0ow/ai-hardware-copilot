"""立创商城实时检索（对接免费 jlcsearch 社区 API，无需鉴权）。

提供：按关键词搜索立创在售器件、真实库存/人民币价格，并把溯源链接指向
立创商品详情页（含参数、Datasheet）。官方 LCSC API 需企业账号申请审核，
个人项目改用 jlcsearch.tscircuit.com（数据同样来自立创）。
"""

import logging

import httpx

logger = logging.getLogger("hwcopilot")

API_BASE = "https://jlcsearch.tscircuit.com"


def product_url(lcsc: int) -> str:
    """立创商品详情页（可溯源，含 Datasheet）。"""
    return f"https://item.szlcsc.com/{lcsc}.html"


def _infer_category(text: str) -> str:
    t = (text or "").lower()
    if any(
        k in t
        for k in (
            "传感器", "sensor", "温湿度", "加速度", "陀螺仪", "心率",
            "霍尔", "光敏", "气压", "麦克风", "红外接收",
        )
    ):
        return "sensor"
    if any(
        k in t
        for k in (
            "单片机", "mcu", "microcontroller", "stm32", "esp32",
            "arduino", "处理器", "树莓", "risc", "msp430",
        )
    ):
        return "mcu"
    if any(
        k in t
        for k in (
            "蓝牙", "wifi", "lora", "模块", "无线电", "zigbee", "ble",
            "射频", "串口转", "以太网", "网口",
        )
    ):
        return "comm"
    if any(
        k in t
        for k in (
            "稳压", "ldo", "电源", "升压", "降压", "锂电池", "充电",
            "dc-dc", "buck", "boost", "电源管理", "电池",
        )
    ):
        return "power"
    return "other"


def _normalize(raw: dict) -> dict | None:
    """把 jlcsearch 返回的单个器件转成统一候选结构。"""
    lcsc = raw.get("lcsc")
    mfr = (raw.get("mfr") or "").strip()
    if not lcsc or not mfr:
        return None
    stock = int(raw.get("stock") or 0)
    description = raw.get("description") or ""
    category = _infer_category(description)
    price = float(raw.get("price") or 0)
    return {
        "id": f"LCSC_{lcsc}",
        "part_number": mfr,
        "category": category,
        "subcategory": "立创商城",
        "manufacturer": "",
        "description": description,
        "package": raw.get("package") or "",
        "price_cny": price,
        "price_unit": "个",
        "stock_status": "现货" if stock > 0 else "缺货",
        "stock": stock,
        "key_params": {
            "package": raw.get("package") or "",
            "stock": stock,
            "price": price,
        },
        "datasheet_url": product_url(lcsc),
        "supplier": "立创商城",
        "supplier_url": product_url(lcsc),
        "source": "lcsc",
    }


def search_parts(query: str, limit: int = 6) -> list[dict]:
    """按关键词搜索立创在售器件，返回统一候选结构。网络失败时返回空表。"""
    try:
        resp = httpx.get(
            f"{API_BASE}/api/search",
            params={"q": query, "limit": limit},
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
            timeout=6,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("立创搜索失败(%s): %s", query, str(exc)[:120])
        return []

    raw_list = data.get("components") or []
    parts = []
    for raw in raw_list:
        p = _normalize(raw)
        if p:
            parts.append(p)
    return parts[:limit]
