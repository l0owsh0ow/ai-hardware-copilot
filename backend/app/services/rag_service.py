"""RAG 检索流程：向量检索(ChromaDB) → 结构化过滤 → LLM 排序 → 型号验证。"""

import logging
import re

from ..config import get_settings
from ..db import db_session, row_to_component_dict
from ..models.schemas import Component, StructuredParams
from .llm_service import LLMService

logger = logging.getLogger(__name__)


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
    settings = get_settings()
    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(settings.embedding_model)
        return model.encode(text).tolist()
    except Exception as exc:
        logger.warning("嵌入模型不可用，回退关键词检索: %s", exc)
        return None


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


def recommend(params: StructuredParams) -> list[Component]:
    settings = get_settings()
    llm = LLMService()

    candidates = _vector_search(params, settings.rag_top_k)
    candidates = _structured_filter(candidates, params)

    if not candidates:
        return []

    ranked = llm.rank_and_reason(
        params, candidates, top_n=settings.rag_max_recommendations
    )

    # 防幻觉：型号交叉验证 + 数据库字段优先
    by_part = {c["part_number"].lower(): c for c in candidates}
    results = []
    for item in ranked:
        part = (item.get("part_number") or "").strip()
        db_row = by_part.get(part.lower())
        if db_row is None:
            logger.warning("LLM 推荐了知识库外型号，已丢弃: %s", part)
            continue
        results.append(
            Component(
                id=db_row["id"],
                part_number=db_row["part_number"],
                category=db_row["category"],
                subcategory=db_row["subcategory"] or "",
                manufacturer=db_row["manufacturer"] or "",
                key_params=db_row.get("key_params") or {},
                price_cny=db_row["price_cny"] or 0,
                price_unit=db_row["price_unit"] or "个",
                stock_status=db_row["stock_status"] or "",
                datasheet_url=db_row["datasheet_url"] or "",
                recommend_reason=item.get("recommend_reason", ""),
                match_score=float(item.get("match_score", 0)),
            )
        )
    return results
