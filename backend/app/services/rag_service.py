"""RAG 检索流程：向量检索(ChromaDB) → 结构化过滤 → LLM 排序 → 型号验证。"""

import logging
import re

from ..config import get_settings
from ..db import db_session, row_to_component_dict
from ..models.schemas import Component, StructuredParams
from . import lcsc_service
from .llm_service import LLMService

logger = logging.getLogger(__name__)

# 嵌入模型全局缓存：SentenceTransformer 冷加载很慢，只应加载一次，后续复用
_embed_model = None


def _get_embed_model():
    """获取（并缓存）sentence-transformers 嵌入模型。"""
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer

        _embed_model = SentenceTransformer(get_settings().embedding_model)
    return _embed_model


def _get_chroma_collection():
    """延迟初始化 ChromaDB（无嵌入模型时返回 None，走关键词回退）。"""
    settings = get_settings()
    try:
        import chromadb

        client = chromadb.PersistentClient(path=settings.resolve_chroma_path())
        collection = client.get_or_create_collection(name="components")
        if collection.count() == 0:
            logger.warning("ChromaDB 集合为空，使用关键词检索回退")
            return None
        return collection
    except Exception as exc:  # pragma: no cover - 依赖缺失/损坏时回退
        logger.warning("ChromaDB 不可用，使用关键词检索回退: %s", exc)
        return None


def _embed(text: str):
    """使用 sentence-transformers 生成 384 维向量；不可用时返回 None。"""
    try:
        return _get_embed_model().encode(text).tolist()
    except Exception as exc:
        logger.warning("嵌入模型不可用，回退关键词检索: %s", exc)
        return None


def warmup() -> None:
    """预热嵌入模型与 Chroma 集合，避免首次推荐冷启动卡顿。"""
    try:
        _get_embed_model()
    except Exception as exc:
        logger.warning("嵌入模型预热失败: %s", exc)
    try:
        _get_chroma_collection()
    except Exception as exc:
        logger.warning("Chroma 预热失败: %s", exc)


def _keyword_search(params: StructuredParams, limit: int) -> list[dict]:
    """关键词检索回退：按短语 + 中文二元组做重叠打分，取前 limit 条。

    向量库/嵌入模型不可用时的兜底方案，保证流程可跑通且结果合理。
    """

    def grams(text: str) -> set[str]:
        out: set[str] = set()
        cjk = ""
        for ch in text:
            if "\u4e00" <= ch <= "\u9fff":
                cjk += ch
            else:
                for i in range(len(cjk) - 1):
                    out.add(cjk[i : i + 2])
                cjk = ""
        for i in range(len(cjk) - 1):
            out.add(cjk[i : i + 2])
        return out

    terms = set()
    for value in (
        [params.application, params.power_supply, params.power_consumption]
        + params.communication
        + params.interface
        + [params.extra_notes or ""]
    ):
        for seg in re.split(r"[\s,，、/;；:：]+", value):
            seg = seg.strip().lower()
            if len(seg) >= 2:
                terms.add(seg)
        terms.update(grams(value))
    terms = {t for t in terms if len(t) >= 2}

    with db_session() as conn:
        rows = conn.execute("SELECT * FROM components").fetchall()

    scored = []
    for row in rows:
        c = row_to_component_dict(row)
        hay = " ".join(
            [
                c["part_number"],
                c.get("category", ""),
                c.get("subcategory", ""),
                c.get("manufacturer", ""),
                c.get("description", ""),
                " ".join(c.get("tags", [])),
            ]
        ).lower()
        hits = sum(1 for t in terms if t in hay)
        if hits:
            scored.append((hits, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:limit]]


def _vector_search(params: StructuredParams, top_k: int) -> list[dict]:
    collection = _get_chroma_collection()
    vector_results: list[dict] = []
    if collection is not None:
        query_text = " ".join(
            [
                params.application,
                params.power_supply,
                params.power_consumption,
                " ".join(params.communication),
                " ".join(params.interface),
            ]
        ).strip() or "硬件项目"

        embedding = _embed(query_text)
        try:
            if embedding:
                result = collection.query(
                    query_embeddings=[embedding],
                    n_results=top_k,
                    include=["documents", "metadatas", "distances"],
                )
            else:
                result = collection.query(
                    query_texts=[query_text],
                    n_results=top_k,
                    include=["documents", "metadatas", "distances"],
                )
            ids = result.get("ids", [[]])[0]
            if ids:
                placeholders = ",".join("?" * len(ids))
                with db_session() as conn:
                    rows = conn.execute(
                        f"SELECT * FROM components WHERE id IN ({placeholders})", ids
                    ).fetchall()
                order = {cid: i for i, cid in enumerate(ids)}
                rows.sort(key=lambda r: order.get(r["id"], 999))
                vector_results = [row_to_component_dict(r) for r in rows]
        except Exception as exc:
            logger.warning("ChromaDB 查询失败，改用关键词检索: %s", exc)

    # 关键词结果与向量结果融合，补足品类覆盖（去重，向量优先）
    keyword_results = _keyword_search(params, top_k)
    merged: list[dict] = []
    seen: set[str] = set()
    for c in vector_results + keyword_results:
        if c["id"] in seen:
            continue
        seen.add(c["id"])
        merged.append(c)
    return merged


def _structured_filter(candidates: list[dict], params: StructuredParams) -> list[dict]:
    """按硬性指标过滤：电压范围、接口、通信方式。"""
    filtered = []
    for c in candidates:
        key_params = c.get("key_params", {})

        # 电压检查：仅当需求电压是芯片级电压(≤5.5V)时硬过滤；
        # 12V/24V 等系统级输入通常经降压后供电，不做硬过滤
        if params.voltage:
            want_v = params.voltage.lower().replace("v", "").strip()
            want = None
            try:
                want = float(want_v)
            except ValueError:
                pass
            if (
                want is not None
                and want <= 5.5
                and c.get("voltage_min") is not None
                and c.get("voltage_max") is not None
            ):
                if not (c["voltage_min"] <= want <= c["voltage_max"]):
                    continue

        # 接口检查：仅对"特定接口"做硬过滤（I2C/SPI/UART/CAN/单总线）；
        # USB/GPIO/PWM/ADC 过于通用（或来自供电描述），不做硬过滤
        interfaces = key_params.get("interfaces") or []
        strict_ifaces = {
            i.lower() for i in params.interface if i.lower() in ("i2c", "spi", "uart", "can", "单总线")
        }
        if strict_ifaces:
            # 传感器/模块类元器件的接口必须与需求匹配
            if c["category"] in ("sensor", "comm") and interfaces:
                if not any(i.lower() in [x.lower() for x in interfaces] for i in strict_ifaces):
                    continue

        filtered.append(c)
    return filtered


def _lcsc_queries(params: StructuredParams) -> list[str]:
    """根据结构化参数生成立创搜索关键词（覆盖传感器/通信/主控/电源）。"""
    app = params.application or ""
    comm = " ".join(params.communication).lower()
    queries: list[str] = []

    if any(w in app for w in ("温湿度", "温度", "湿度", "温控")):
        queries.append("温湿度传感器")
    elif any(w in app for w in ("心率", "心电", "血氧", "体温")):
        queries.append("心率传感器")
    elif any(w in app for w in ("气体", "空气", "烟雾", "pm")):
        queries.append("气体传感器")
    elif any(w in app for w in ("光照", "光强", "光敏")):
        queries.append("光敏传感器")
    elif any(w in app for w in ("测距", "距离", "避障")):
        queries.append("测距模块")

    if "蓝牙" in comm or "ble" in comm:
        queries.append("蓝牙模块")
    elif "wifi" in comm or "wi-fi" in comm:
        queries.append("wifi模块")
    elif "lora" in comm:
        queries.append("lora模块")

    if not queries:
        queries.append("单片机")

    if "电池" in (params.power_supply or "") or "低功耗" in (params.power_consumption or ""):
        queries.append("电源管理")

    seen: set[str] = set()
    out: list[str] = []
    for q in queries:
        if q and q not in seen:
            seen.add(q)
            out.append(q)
    return out[:4]


def _search_lcsc(params: StructuredParams, settings) -> list[dict]:
    """立创实时检索，返回去重后的候选；失败返回空表。"""
    if not settings.enable_lcsc:
        return []
    parts: list[dict] = []
    seen: set[str] = set()
    for q in _lcsc_queries(params):
        for p in lcsc_service.search_parts(q, limit=5):
            key = p["part_number"].lower()
            if key in seen:
                continue
            # 只保留有库存的
            if p.get("stock", 0) <= 0:
                continue
            seen.add(key)
            parts.append(p)
    return parts[:8]


def _infer_category(c: dict) -> str:
    """为本地候选推断品类（缺少 category 时用描述兜底）。"""
    if c.get("category"):
        return c["category"]
    return lcsc_service._infer_category(c.get("description", ""))


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _assemble(ranked: list[dict], candidates: list[dict]) -> list[Component]:
    """把候选排序结果组装成 Component 列表，逐条容错，绝不会因单条异常而失败。"""
    by_part = {c["part_number"].lower(): c for c in candidates}
    results: list[Component] = []
    for item in ranked:
        part = (item.get("part_number") or "").strip()
        cand = by_part.get(part.lower())
        if cand is None:
            logger.warning("推荐了候选之外的型号，已丢弃: %s", part)
            continue
        if cand.get("source") == "lcsc":
            comp = dict(
                id=cand["id"],
                part_number=cand["part_number"],
                category=cand["category"],
                subcategory=cand.get("subcategory") or "立创商城",
                manufacturer=cand.get("manufacturer") or "",
                key_params=cand.get("key_params") or {},
                price_cny=_safe_float(cand.get("price_cny")),
                price_unit=cand.get("price_unit") or "个",
                stock_status=cand.get("stock_status") or "现货",
                datasheet_url=cand.get("datasheet_url") or "",
                recommend_reason=item.get("recommend_reason", ""),
                match_score=_safe_float(item.get("match_score")),
            )
        else:
            comp = dict(
                id=cand["id"],
                part_number=cand["part_number"],
                category=cand["category"],
                subcategory=cand.get("subcategory") or "",
                manufacturer=cand.get("manufacturer") or "",
                key_params=cand.get("key_params") or {},
                price_cny=_safe_float(cand.get("price_cny")),
                price_unit=cand.get("price_unit") or "个",
                stock_status=cand.get("stock_status") or "",
                datasheet_url=cand.get("datasheet_url") or "",
                recommend_reason=item.get("recommend_reason", ""),
                match_score=_safe_float(item.get("match_score")),
            )
        try:
            results.append(Component(**comp))
        except Exception as exc:
            logger.warning("组装推荐结果失败，跳过 %s: %s", part, str(exc)[:120])
    return results


def recommend(params: StructuredParams) -> tuple[list[Component], bool]:
    """推荐元器件（本地知识库 RAG + 立创实时检索），异常时回退规则排序，绝不抛错。"""
    settings = get_settings()
    llm = LLMService()

    try:
        local_candidates = _vector_search(params, settings.rag_top_k)
        local_candidates = _structured_filter(local_candidates, params)
        for c in local_candidates:
            c["source"] = "local"

        lcsc_candidates = _search_lcsc(params, settings)

        candidates = list(local_candidates) + list(lcsc_candidates)
        if not candidates:
            return [], False

        # 品类均衡压缩候选，控制在 LLM 上下文内（每类立创 3 + 本地 3）
        per_category: dict[str, list[dict]] = {}
        for c in candidates:
            per_category.setdefault(_infer_category(c), []).append(c)
        balanced: list[dict] = []
        for cat in sorted(per_category.keys()):
            lcsc_in_cat = [c for c in per_category[cat] if c.get("source") == "lcsc"]
            local_in_cat = [c for c in per_category[cat] if c.get("source") != "lcsc"]
            balanced.extend(lcsc_in_cat[:3])
            balanced.extend(local_in_cat[:3])
        candidates = balanced[:18]

        degraded = False
        try:
            ranked = llm.rank_and_reason(
                params, candidates, top_n=settings.rag_max_recommendations
            )
        except Exception as exc:
            logger.warning("LLM 排序失败，回退规则排序: %s", str(exc)[:200])
            ranked = llm._mock_rank(
                params, candidates, top_n=settings.rag_max_recommendations
            )
            degraded = True

        return _assemble(ranked, candidates), degraded
    except Exception as exc:
        # 任何意外异常：回退到纯规则排序，保证"永远有结果"，绝不返回 500
        logger.warning("推荐流程异常，回退规则排序: %s", str(exc)[:200])
        try:
            fallback = _keyword_search(params, settings.rag_max_recommendations * 3)
            ranked = llm._mock_rank(
                params, fallback, top_n=settings.rag_max_recommendations
            )
            return _assemble(ranked, fallback), True
        except Exception:
            return [], True
