"""历史记录：保存/列表/详情/删除（纯数据库读写，不调用 LLM，不消耗 token）。"""

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..db import db_session
from ..models.schemas import (
    Component,
    HistoryCreateRequest,
    HistoryCreateResponse,
    HistoryDetailResponse,
    HistoryListItem,
    HistoryListResponse,
    StructuredParams,
)

router = APIRouter()


def _compact_component(c: Component) -> dict:
    """保留紧凑字段 + 推荐理由（查看历史时能看到"为什么选它"）。"""
    return {
        "id": c.id,
        "part_number": c.part_number,
        "category": c.category,
        "subcategory": c.subcategory,
        "manufacturer": c.manufacturer,
        "key_params": c.key_params,
        "price_cny": c.price_cny,
        "price_unit": c.price_unit,
        "stock_status": c.stock_status,
        "datasheet_url": c.datasheet_url,
        "match_score": c.match_score,
        "recommend_reason": c.recommend_reason,
    }


@router.post("/api/v1/history", response_model=HistoryCreateResponse)
async def create_history(req: HistoryCreateRequest):
    record_id = uuid.uuid4().hex[:12]
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    title = (req.title or "未命名方案")[:40]
    query = (req.query_text or "")[:150]
    with db_session() as conn:
        conn.execute(
            "INSERT INTO history_records (id, title, query_text, params_json, recommendations_json, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                record_id,
                title,
                query,
                req.params.model_dump_json(),
                json.dumps([_compact_component(c) for c in req.recommendations], ensure_ascii=False),
                now,
            ),
        )
    return HistoryCreateResponse(id=record_id)


@router.get("/api/v1/history", response_model=HistoryListResponse)
async def list_history(limit: int = 100):
    with db_session() as conn:
        rows = conn.execute(
            "SELECT id, title, query_text, created_at, recommendations_json"
            " FROM history_records ORDER BY created_at DESC, rowid DESC LIMIT ?",
            (limit,),
        ).fetchall()
    items = []
    for r in rows:
        try:
            count = len(json.loads(r["recommendations_json"] or "[]"))
        except json.JSONDecodeError:
            count = 0
        items.append(
            HistoryListItem(
                id=r["id"],
                title=r["title"],
                query_text=r["query_text"] or "",
                created_at=r["created_at"] or "",
                count=count,
            )
        )
    return HistoryListResponse(items=items)


@router.get("/api/v1/history/{record_id}", response_model=HistoryDetailResponse)
async def get_history(record_id: str):
    with db_session() as conn:
        row = conn.execute(
            "SELECT * FROM history_records WHERE id = ?", (record_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    try:
        params = StructuredParams(**json.loads(row["params_json"] or "{}"))
    except (json.JSONDecodeError, TypeError):
        params = StructuredParams()
    try:
        recs = [Component(**c) for c in json.loads(row["recommendations_json"] or "[]")]
    except (json.JSONDecodeError, TypeError):
        recs = []
    return HistoryDetailResponse(
        id=row["id"],
        title=row["title"],
        query_text=row["query_text"] or "",
        created_at=row["created_at"] or "",
        params=params,
        recommendations=recs,
    )


@router.delete("/api/v1/history/{record_id}")
async def delete_history(record_id: str):
    with db_session() as conn:
        cur = conn.execute("DELETE FROM history_records WHERE id = ?", (record_id,))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    return {"ok": True}


@router.delete("/api/v1/history")
async def clear_history():
    with db_session() as conn:
        conn.execute("DELETE FROM history_records")
    return {"ok": True}
