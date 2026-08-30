"""埋点接口：事件上报 + 汇总看板。"""

import json
from datetime import datetime

from fastapi import APIRouter

from ..db import db_session
from ..models.schemas import AnalyticsEventRequest, AnalyticsSummaryResponse

router = APIRouter()


@router.post("/api/v1/analytics/event")
async def track_event(req: AnalyticsEventRequest):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with db_session() as conn:
        conn.execute(
            "INSERT INTO analytics_events (event, session_id, payload_json, created_at)"
            " VALUES (?, ?, ?, ?)",
            (req.event, req.session_id[:64], json.dumps(req.payload, ensure_ascii=False)[:2000], now),
        )
    return {"ok": True}


@router.get("/api/v1/analytics/summary", response_model=AnalyticsSummaryResponse)
async def analytics_summary():
    today = datetime.now().strftime("%Y-%m-%d")
    funnel_events = [
        "parse_start", "parse_success", "recommend_start", "recommend_success",
        "rec_card_click", "bom_generate", "bom_export",
    ]
    with db_session() as conn:
        total = conn.execute("SELECT COUNT(*) FROM analytics_events").fetchone()[0]
        today_count = conn.execute(
            "SELECT COUNT(*) FROM analytics_events WHERE created_at LIKE ?", (f"{today}%",)
        ).fetchone()[0]
        funnel = {}
        for ev in funnel_events:
            funnel[ev] = conn.execute(
                "SELECT COUNT(*) FROM analytics_events WHERE event = ?", (ev,)
            ).fetchone()[0]
        recent_rows = conn.execute(
            "SELECT event, session_id, created_at FROM analytics_events ORDER BY id DESC LIMIT 20"
        ).fetchall()
    recent = [dict(r) for r in recent_rows]
    return AnalyticsSummaryResponse(total=total, today=today_count, funnel=funnel, recent=recent)
