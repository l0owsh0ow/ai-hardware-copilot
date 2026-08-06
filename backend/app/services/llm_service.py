"""LLM 调用封装：需求解析 + 候选排序/推荐理由。

LLM_PROVIDER:
- claude: Anthropic Messages API
- openai: OpenAI Chat Completions API
- mock: 规则解析 + 关键词打分（无 API Key 时跑通全流程）
"""

import json
import re

import httpx

from ..config import get_settings
from ..models.schemas import StructuredParams

PARSE_PROMPT = """你是一个硬件选型助手。请从用户的自然语言描述中提取以下结构化参数：

用户输入: "{user_text}"

请提取以下字段（如果用户未提及，根据上下文推断或留空）：
- application: 应用场景
- power_supply: 供电方式 (电池/USB/适配器/太阳能)
- power_consumption: 功耗要求
- communication: 通信方式 (蓝牙/WiFi/LoRa/串口等)，数组
- interface: 接口类型 (I2C/SPI/UART/GPIO等)，数组
- voltage: 电压要求
- budget: 预算
- duration: 工作时长要求
- extra_notes: 其他备注

只输出 JSON，不要输出其他内容。JSON 格式:
{{"application": "...", "power_supply": "...", "power_consumption": "...",
  "communication": [...], "interface": [...], "voltage": "...",
  "budget": "...", "duration": "...", "extra_notes": "..."}}
"""

RANK_PROMPT = """你是一个硬件选型专家。根据用户需求参数，从以下候选元器件中选择最匹配的{top_n}个。

用户需求: {params}

候选元器件列表:
{candidates}

要求:
1. 只能从候选列表中选择，不能编造型号
2. 为每个选中的元器件撰写推荐理由（说明为什么适合该场景，50-100字）
3. 给出匹配度评分 (0-1)
4. 输出格式: JSON数组

输出格式:
[
  {{
    "id": "候选列表中的id",
    "part_number": "型号",
    "recommend_reason": "推荐理由",
    "match_score": 0.95
  }}
]
"""


class LLMService:
    def __init__(self):
        self.settings = get_settings()
        self.provider = self.settings.llm_provider
        if self.provider not in ("claude", "openai", "mock"):
            self.provider = "mock"

    # ---------- 对外接口 ----------

    def parse_requirements(self, text: str) -> StructuredParams:
        if self.provider == "mock":
            return self._mock_parse(text)
        raw = self._chat(PARSE_PROMPT.format(user_text=text))
        data = self._extract_json(raw)
        return StructuredParams(**data)

    def rank_and_reason(
        self, params: StructuredParams, candidates: list[dict], top_n: int = 5
    ) -> list[dict]:
        """candidates 为数据库行字典（含 description/tags/key_params）。"""
        if self.provider == "mock":
            return self._mock_rank(params, candidates, top_n)
        candidate_text = "\n".join(
            f"- {c['part_number']} ({c['category']}) {c['description']}"
            for c in candidates
        )
        raw = self._chat(
            RANK_PROMPT.format(
                top_n=top_n,
                params=params.model_dump_json(),
                candidates=candidate_text,
            )
        )
        data = self._extract_json(raw)
        return data if isinstance(data, list) else []

    # ---------- LLM 调用 ----------

    def _chat(self, prompt: str) -> str:
        settings = self.settings
        if not settings.llm_api_key:
            raise RuntimeError("未配置 LLM_API_KEY")
        if self.provider == "claude":
            return self._chat_claude(prompt)
        return self._chat_openai(prompt)

    def _chat_claude(self, prompt: str) -> str:
        settings = self.settings
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.llm_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]

    def _chat_openai(self, prompt: str) -> str:
        settings = self.settings
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.llm_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    @staticmethod
    def _extract_json(raw: str):
        """从 LLM 输出中提取 JSON（容忍 markdown 代码块包裹）。"""
        text = raw.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("[")
            if start == -1:
                start = text.find("{")
            if start == -1:
                raise ValueError("LLM 输出不是合法 JSON")
            try:
                return json.loads(text[start:])
            except json.JSONDecodeError:
                raise ValueError("LLM 输出不是合法 JSON")

    # ---------- Mock 实现（无 Key 时用于开发联调） ----------

    _APPLICATION_KEYWORDS = [
        ("环境监测", "环境监测"),
        ("空气质量", "空气质量监测"),
        ("PM2.5", "PM2.5监测"),
        ("PM10", "PM2.5监测"),
        ("气体", "气体检测"),
        ("烟雾", "烟雾报警"),
        ("温湿度", "温湿度监测"),
        ("温度", "温度监测"),
        ("湿度", "湿度监测"),
        ("光照", "光照监测"),
        ("光强", "光照监测"),
        ("亮度", "光照监测"),
        ("心率", "心率监测"),
        ("血氧", "血氧监测"),
        ("心电", "心电监测"),
        ("手环", "可穿戴健康监测"),
        ("手表", "可穿戴设备"),
        ("小车", "智能小车"),
        ("机器人", "机器人"),
        ("无人机", "无人机"),
        ("平衡车", "平衡车"),
        ("门禁", "门禁系统"),
        ("避障", "机器人避障"),
        ("测距", "距离测量"),
        ("遥控", "无线遥控"),
        ("定位", "定位追踪"),
        ("GPS", "定位追踪"),
        ("气象", "气象监测"),
        ("农业", "农业监测"),
        ("传感器", "传感器数据采集"),
        ("物联网", "物联网节点"),
        ("智能家居", "智能家居"),
        ("电赛", "电子设计竞赛项目"),
        ("毕设", "毕业设计项目"),
        ("充电宝", "移动电源"),
        ("太阳能", "太阳能供电系统"),
    ]

    _POWER_SUPPLY_KEYWORDS = [
        ("电池", "电池供电"),
        ("USB", "USB 5V 供电"),
        ("适配器", "12V 适配器供电"),
        ("太阳能", "太阳能供电"),
        ("充电宝", "移动电源供电"),
    ]

    _POWER_CONSUMPTION_KEYWORDS = [
        ("超低功耗", "超低功耗"),
        ("低功耗", "低功耗"),
        ("省电", "低功耗"),
        ("续航", "长续航"),
    ]

    _VOLTAGE_KEYWORDS = [
        ("3.3V", "3.3V"),
        ("3.3", "3.3V"),
        ("5V", "5V"),
        ("3.7V", "3.7V"),
        ("3.7", "3.7V"),
        ("12V", "12V"),
    ]

    _DURATION_KEYWORDS = [
        ("半年", "6个月以上"),
        ("一年", "12个月以上"),
        ("一周", "7天以上"),
        ("个月", "数个月"),
        ("长时间", "长时间"),
    ]

    _BUDGET_KEYWORDS = [
        ("50元", "50元以内"),
        ("20元", "20元以内"),
        ("100元", "100元以内"),
        ("200元", "200元以内"),
        ("预算", "预算有限"),
    ]

    _COMMUNICATION = ["蓝牙", "BLE", "WiFi", "LoRa", "串口", "红外", "NFC", "以太网", "4G", "2.4G", "433"]
    _INTERFACE = ["I2C", "SPI", "UART", "GPIO", "USB", "ADC", "PWM", "CAN", "单总线"]

    # 应用场景 → 相关品类（用于打分加权）
    _SENSOR_APP_WORDS = ("监测", "测量", "检测", "采集", "传感器", "温湿度", "温度", "湿度", "空气", "PM2.5", "气体", "光照", "心率", "血氧", "心电", "距离", "测距", "气压", "烟雾", "罗盘", "指南针")
    _POWER_APP_WORDS = ("供电", "电源", "充电", "太阳能", "功耗", "续航", "移动电源")
    _COMM_APP_WORDS = ("通信", "无线", "远程", "联网", "透传", "遥控", "蓝牙", "WiFi", "LoRa")
    _MCU_APP_WORDS = ("控制", "小车", "机器人", "电赛", "飞控", "手环", "手表", "智能", "开发")

    def _mock_parse(self, text: str) -> StructuredParams:
        params = StructuredParams()
        lowered = text.lower()
        for kw, val in self._APPLICATION_KEYWORDS:
            if kw.lower() in lowered:
                params.application = val
                break
        for kw, val in self._POWER_SUPPLY_KEYWORDS:
            if kw.lower() in lowered:
                params.power_supply = val
                break
        for kw, val in self._POWER_CONSUMPTION_KEYWORDS:
            if kw.lower() in lowered:
                params.power_consumption = val
                break
        for kw, val in self._VOLTAGE_KEYWORDS:
            if kw.lower() in lowered:
                params.voltage = val
                break
        for kw, val in self._DURATION_KEYWORDS:
            if kw.lower() in lowered:
                params.duration = val
                break
        for kw, val in self._BUDGET_KEYWORDS:
            if kw.lower() in lowered:
                params.budget = val
                break
        params.communication = [
            c for c in self._COMMUNICATION if c.lower() in lowered
        ]
        params.interface = [i for i in self._INTERFACE if i.lower() in lowered]
        # 中文习惯补充映射
        if "串口" in lowered and "UART" not in params.interface:
            params.interface.append("UART")
        if ("电机" in lowered or "舵机" in lowered or "调速" in lowered) and "PWM" not in params.interface:
            params.interface.append("PWM")
        if "模拟" in lowered and "ADC" not in params.interface:
            params.interface.append("ADC")
        # 默认推断
        if not params.application:
            params.application = "通用硬件项目"
        if not params.communication and not params.interface:
            params.interface = ["GPIO"]
        params.extra_notes = text[:200]
        return params

    def _mock_rank(
        self, params: StructuredParams, candidates: list[dict], top_n: int = 5
    ) -> list[dict]:
        """关键词重叠 + 接口匹配 + 品类相关度打分，并保证品类多样化。"""
        keywords = set()
        for value in (
            [
                params.application,
                params.power_supply,
                params.power_consumption,
                params.voltage,
                params.budget,
                params.duration,
            ]
            + params.communication
            + params.interface
        ):
            for seg in re.split(r"[\s,，、/;；]+", value):
                seg = seg.strip().lower()
                if len(seg) >= 2:
                    keywords.add(seg)

        # 应用场景补充子词：如 "温湿度监测" 拆出 "温湿度"、"监测"
        app = params.application or ""
        keywords.update(self._cjk_grams(app))
        # 原始需求文本中的词也参与打分
        notes = params.extra_notes or ""
        keywords.update(self._cjk_grams(notes))
        for tok in re.findall(r"[A-Za-z0-9.]+", notes):
            if len(tok) >= 2:
                keywords.add(tok.lower())

        comm_text = " ".join(params.communication).lower()
        want_interfaces = {i.lower() for i in params.interface}

        # 品类相关度
        sensor_app = any(w in app for w in self._SENSOR_APP_WORDS)
        power_app = any(w in app for w in self._POWER_APP_WORDS) or bool(params.power_supply)
        comm_app = any(w in app for w in self._COMM_APP_WORDS) or bool(comm_text)
        mcu_app = any(w in app for w in self._MCU_APP_WORDS) or not (sensor_app or power_app or comm_app)

        scored = []
        for c in candidates:
            haystack = " ".join(
                [
                    c.get("description", ""),
                    c.get("category", ""),
                    c.get("subcategory", ""),
                    c.get("manufacturer", ""),
                    " ".join(c.get("tags", [])),
                    str(c.get("key_params", {})),
                ]
            ).lower()
            hits = sum(1 for kw in keywords if kw in haystack)
            score = 0.30 + hits * 0.09

            interfaces = [str(x).lower() for x in (c.get("key_params", {}).get("interfaces") or [])]
            if want_interfaces and interfaces and want_interfaces & set(interfaces):
                score += 0.10

            category = c.get("category", "")
            subcategory = c.get("subcategory", "")
            tags_text = " ".join(c.get("tags", [])).lower()
            if category == "sensor" and sensor_app:
                score += 0.12
            elif category == "power" and power_app:
                score += 0.05
            elif category == "comm" and comm_app:
                score += 0.12
            elif category == "mcu" and mcu_app:
                score += 0.10
            # 控制类场景（小车/机器人/电赛）对主控需求更强
            if category == "mcu" and any(w in app for w in ("小车", "机器人", "电赛", "飞控", "控制")):
                score += 0.05

            # 明确不相关的惩罚
            if sensor_app and category not in ("sensor", "mcu"):
                score -= 0.15
            if app and ("小车" in app or "机器人" in app or "电机" in app) and category not in ("mcu", "comm"):
                score -= 0.10
            if comm_text and category not in ("comm", "mcu"):
                score -= 0.08

            if c.get("stock_status") == "现货":
                score += 0.03
            score = min(score, 0.99)
            scored.append((score, c))

        scored.sort(key=lambda x: x[0], reverse=True)

        # 品类多样化：先按品类最高分排序，每类取最优，再按分数补足名额
        by_category: dict[str, list[tuple[float, dict]]] = {}
        for item in scored:
            by_category.setdefault(item[1]["category"], []).append(item)
        category_order = sorted(by_category.keys(), key=lambda k: by_category[k][0][0], reverse=True)

        results: list[tuple[float, dict]] = []
        used_ids: set[str] = set()
        cat_count: dict[str, int] = {}
        for cat in category_order:
            best = by_category[cat][0]
            results.append(best)
            used_ids.add(best[1]["id"])
            cat_count[cat] = 1
        for item in scored:
            if len(results) >= top_n:
                break
            if item[1]["id"] in used_ids:
                continue
            cat = item[1]["category"]
            if cat_count.get(cat, 0) >= 2:
                continue
            results.append(item)
            used_ids.add(item[1]["id"])
            cat_count[cat] = cat_count.get(cat, 0) + 1

        output = []
        for score, c in results[:top_n]:
            output.append(
                {
                    "id": c["id"],
                    "part_number": c["part_number"],
                    "recommend_reason": (
                        f"{c['part_number']} 匹配你的需求"
                        f"（{params.application or '通用项目'}场景），"
                        f"{c.get('description', '')[:60]}。"
                    ),
                    "match_score": round(score, 2),
                }
            )
        return output

    @staticmethod
    def _cjk_grams(text: str) -> set[str]:
        """提取中文二元组：'温湿度监测' -> {'温湿','湿度','度监','监测'}。"""
        grams: set[str] = set()
        cjk_run = ""
        for ch in text:
            if "\u4e00" <= ch <= "\u9fff":
                cjk_run += ch
            else:
                for i in range(len(cjk_run) - 1):
                    grams.add(cjk_run[i : i + 2])
                cjk_run = ""
        for i in range(len(cjk_run) - 1):
            grams.add(cjk_run[i : i + 2])
        return grams
