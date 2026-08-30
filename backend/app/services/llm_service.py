"""LLM 调用封装：需求解析 + 候选排序/推荐理由。

LLM_PROVIDER:
- claude: Anthropic Messages API
- openai: OpenAI Chat Completions API
- mock: 规则解析 + 关键词打分（无 API Key 时跑通全流程）
"""

import json
import os
import re
import subprocess
import sys
import time

import httpx

from ..config import get_settings
from ..db import db_session
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

{example}
"""

SYSTEM_PROMPT = (
    "你是一个专业的硬件选型助手。请始终使用简体中文回答。"
    "严格遵守输出格式要求：只输出 JSON，不要输出任何多余文字，"
    "不要使用 Markdown 代码块包裹。"
)

PARSE_EXAMPLE = """示例输入: "我要做一个低功耗蓝牙温湿度传感器，用电池供电，需要工作半年以上"
示例输出: {"application": "温湿度监测", "power_supply": "电池供电", "power_consumption": "低功耗", "communication": ["蓝牙"], "interface": ["I2C"], "voltage": "", "budget": "", "duration": "6个月以上", "extra_notes": ""}

注意: communication 和 interface 必须是 JSON 数组，即使只有一个元素。
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

示例（需求是温湿度传感器项目时，应优先选择温湿度传感器、低功耗MCU、LDO稳压器）:
[
  {{"id": "sensor-sht30", "part_number": "SHT30", "recommend_reason": "I2C接口、低功耗、高精度温湿度传感器，适合环境监测", "match_score": 0.96}},
  {{"id": "mcu-stm32l432kc", "part_number": "STM32L432KC", "recommend_reason": "超低功耗MCU，适合电池供电的传感器节点", "match_score": 0.93}},
  {{"id": "power-ht7333", "part_number": "HT7333", "recommend_reason": "超低静态电流LDO，适合电池供电", "match_score": 0.9}}
]

注意: 必须根据用户需求的应用场景选择对应品类的元器件（如温湿度监测选传感器、小车选电机驱动相关、心率监测选健康类传感器），不能随意选择。
"""

# 各 OpenAI 兼容供应商的默认接口地址
DEFAULT_BASE_URLS = {
    "deepseek": "https://api.deepseek.com/chat/completions",
    "openai": "https://api.openai.com/v1/chat/completions",
    "local": "http://localhost:11434/v1/chat/completions",
    "custom": "",
}


class LLMService:
    def __init__(self):
        self.settings = get_settings()
        self.provider = self._load_llm_settings()["provider"]

    # ---------- 配置加载（数据库设置优先，环境变量兜底） ----------

    @staticmethod
    def _load_llm_settings() -> dict:
        """读取当前生效的 LLM 配置。"""
        settings = get_settings()
        db: dict[str, str] = {}
        try:
            with db_session() as conn:
                rows = conn.execute("SELECT key, value FROM app_settings").fetchall()
                db = {r["key"]: r["value"] for r in rows}
        except Exception:
            pass
        provider = (db.get("llm_provider") or settings.llm_provider).strip().lower()
        if provider not in ("claude", "openai", "deepseek", "local", "custom", "mock"):
            provider = "mock"
        return {
            "provider": provider,
            "model": db.get("llm_model") or settings.llm_model,
            "base_url": (db.get("llm_base_url") or "").strip(),
            "api_key": db.get("llm_api_key") or settings.llm_api_key,
        }

    # ---------- 对外接口 ----------

    def parse_requirements(self, text: str) -> StructuredParams:
        cfg = self._load_llm_settings()
        if cfg["provider"] == "mock":
            return self._mock_parse(text)
        raw = self._chat(
            PARSE_PROMPT.format(user_text=text, example=PARSE_EXAMPLE), cfg
        )
        data = self._extract_json(raw)
        parsed = StructuredParams(**data)
        # 本地小模型解析能力有限：用规则补漏修正
        if cfg["provider"] == "local":
            return self._rule_correct_parse(parsed, text)
        return parsed

    def _rule_correct_parse(self, parsed: StructuredParams, text: str) -> StructuredParams:
        """本地模型解析的规则补漏：补空字段 + 修正误分类。"""
        mock = self._mock_parse(text)
        # 补空字段
        if not parsed.application:
            parsed.application = mock.application
        if not parsed.power_supply:
            parsed.power_supply = mock.power_supply
        if not parsed.power_consumption:
            parsed.power_consumption = mock.power_consumption
        if not parsed.voltage:
            parsed.voltage = mock.voltage
        if not parsed.budget:
            parsed.budget = mock.budget
        if not parsed.duration:
            parsed.duration = mock.duration
        # 修正误分类：通信里的接口词挪到接口（I2C/SPI/UART/GPIO/USB 等）
        iface_words = {"i2c", "spi", "uart", "gpio", "usb", "adc", "pwm", "can"}
        kept_comm = []
        moved = []
        for c in parsed.communication:
            if c.lower() in iface_words:
                moved.append(c)
            else:
                kept_comm.append(c)
        parsed.communication = kept_comm
        parsed.interface = list(dict.fromkeys(parsed.interface + moved))
        # 都空则用规则兜底
        if not parsed.communication and not parsed.interface:
            parsed.communication = mock.communication
            parsed.interface = mock.interface
        return parsed

    def rank_and_reason(
        self, params: StructuredParams, candidates: list[dict], top_n: int = 5
    ) -> list[dict]:
        """candidates 为数据库行字典（含 description/tags/key_params）。"""
        cfg = self._load_llm_settings()
        if cfg["provider"] == "mock":
            return self._mock_rank(params, candidates, top_n)
        # 候选信息压缩：控制 prompt 大小（小模型上下文有限）
        candidate_lines = []
        for c in candidates:
            kp = c.get("key_params") or {}
            top = {
                k: kp[k]
                for k in (
                    "core", "max_frequency", "flash", "interfaces",
                    "working_voltage", "standby_current", "range", "output",
                    "temperature_accuracy", "bluetooth", "wireless",
                )
                if k in kp
            }
            desc = (c.get("description") or "")[:60]
            candidate_lines.append(
                f"- {c['part_number']} | {c.get('manufacturer','')} | {c.get('category','')}/{c.get('subcategory','')}"
                f" | ¥{c.get('price_cny','')} | {json.dumps(top, ensure_ascii=False)[:120]} | {desc}"
            )
        candidate_text = "\n".join(candidate_lines)
        raw = self._chat(
            RANK_PROMPT.format(
                top_n=top_n,
                params=params.model_dump_json(),
                candidates=candidate_text,
            ),
            cfg,
        )
        data = self._extract_json(raw)
        return data if isinstance(data, list) else []

    # ---------- LLM 调用 ----------

    def _chat(self, prompt: str, cfg: dict) -> str:
        provider = cfg["provider"]
        if provider == "claude":
            return self._chat_claude(prompt, cfg)
        return self._chat_openai_compatible(prompt, cfg)

    def _chat_claude(self, prompt: str, cfg: dict) -> str:
        if not cfg.get("api_key"):
            raise RuntimeError("未配置 Claude API Key")
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": cfg["api_key"],
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": cfg["model"],
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]

    def _chat_openai_compatible(self, prompt: str, cfg: dict) -> str:
        """DeepSeek / OpenAI / 本地 Ollama 等统一走 OpenAI 兼容接口。"""
        base = cfg.get("base_url") or DEFAULT_BASE_URLS.get(cfg["provider"], "")
        if not base:
            raise RuntimeError("未配置 Base URL")
        # 本地 Ollama：经子进程调用，规避长驻进程的本地网络拦截
        if cfg["provider"] == "local":
            return self._chat_local_via_subprocess(prompt, cfg, base)
        headers = {"Content-Type": "application/json"}
        if cfg.get("api_key"):
            headers["Authorization"] = f"Bearer {cfg['api_key']}"
        payload = {
            "model": cfg["model"],
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        # 本地 Ollama：关闭 Qwen3 思考模式 + 模型常驻内存（避免卸载后 502）
        if cfg["provider"] == "local":
            payload["think"] = False
            payload["keep_alive"] = "30m"
        # 本地模型冷启动/重载瞬间可能返回 502，重试一次
        attempts = 3 if cfg["provider"] == "local" else 1
        resp = None
        for attempt in range(attempts):
            resp = httpx.post(base, headers=headers, json=payload, timeout=180)
            if resp.status_code != 502 or attempt == attempts - 1:
                break
            time.sleep(3)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    def _chat_local_via_subprocess(self, prompt: str, cfg: dict, base: str) -> str:
        """通过短命子进程调用本地 Ollama，避免长驻进程网络层 502 问题。"""
        helper = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "scripts", "ollama_call.py"
        )
        payload = {
            "url": base,
            "model": cfg["model"],
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "think": False,
            "keep_alive": "30m",
        }
        for attempt in range(3):
            proc = subprocess.run(
                [sys.executable, helper],
                input=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                capture_output=True,
                timeout=240,
            )
            out = proc.stdout.decode("utf-8", errors="replace").strip()
            err = proc.stderr.decode("utf-8", errors="replace").strip()
            if proc.returncode == 0 and out:
                return out
            if attempt == 2:
                raise RuntimeError(err[:300])
            time.sleep(3)
        raise RuntimeError("本地模型调用失败")

    # ---------- 连通性测试（个人主页"测试连接"用） ----------

    def test_connection(self, cfg: dict | None = None) -> dict:
        cfg = cfg or self._load_llm_settings()
        if cfg["provider"] == "mock":
            return {"ok": True, "latency_ms": 0, "model": "mock", "error": ""}
        start = time.time()
        try:
            self._chat("请只回复两个字：正常", cfg)
            return {
                "ok": True,
                "latency_ms": int((time.time() - start) * 1000),
                "model": cfg["model"],
                "error": "",
            }
        except Exception as exc:
            return {
                "ok": False,
                "latency_ms": int((time.time() - start) * 1000),
                "model": cfg["model"],
                "error": str(exc)[:300],
            }

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
