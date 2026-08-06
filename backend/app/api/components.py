"""元器件详情与搜索接口。"""

import json

from fastapi import APIRouter, HTTPException, Query

from ..db import db_session
from ..models.schemas import (
    Component,
    ComponentDetail,
    ComponentDetailResponse,
    ComponentSearchResponse,
)

router = APIRouter()


def _row_to_detail(row) -> ComponentDetail:
    key_params = json.loads(row["params_json"] or "{}")
    tags = [t for t in (row["tags"] or "").split(",") if t]
    typical = key_params.pop("typical_applications", []) if isinstance(key_params, dict) else []
    difficulty = key_params.pop("difficulty_level", "") if isinstance(key_params, dict) else ""
    notes = key_params.pop("notes", "") if isinstance(key_params, dict) else ""
    return ComponentDetail(
        id=row["id"],
        part_number=row["part_number"],
        category=row["category"],
        subcategory=row["subcategory"] or "",
        manufacturer=row["manufacturer"] or "",
        key_params=key_params,
        price_cny=row["price_cny"] or 0,
        price_unit=row["price_unit"] or "个",
        stock_status=row["stock_status"] or "",
        datasheet_url=row["datasheet_url"] or "",
        description=row["description"] or "",
        package=row["package"] or "",
        supplier=row["supplier"] or "",
        supplier_url=row["supplier_url"] or "",
        tags=tags,
        typical_applications=typical if isinstance(typical, list) else [],
        difficulty_level=difficulty if isinstance(difficulty, str) else "",
        notes=notes if isinstance(notes, str) else "",
    )


# 注意：/search 必须声明在 /{component_id} 之前，否则 "search" 会被当作 id 匹配
@router.get("/api/v1/components/search", response_model=ComponentSearchResponse)
async def search_components(q: str = Query(""), category: str = Query("")):
    sql = "SELECT * FROM components WHERE 1=1"
    args = []
    if q:
        sql += " AND (part_number LIKE ? OR description LIKE ? OR tags LIKE ?)"
        like = f"%{q}%"
        args += [like, like, like]
    if category:
        sql += " AND category = ?"
        args.append(category)
    sql += " LIMIT 50"
    with db_session() as conn:
        rows = conn.execute(sql, args).fetchall()

    results = []
    for r in rows:
        key_params = json.loads(r["params_json"] or "{}")
        results.append(
            Component(
                id=r["id"],
                part_number=r["part_number"],
                category=r["category"],
                subcategory=r["subcategory"] or "",
                manufacturer=r["manufacturer"] or "",
                key_params=key_params,
                price_cny=r["price_cny"] or 0,
                price_unit=r["price_unit"] or "个",
                stock_status=r["stock_status"] or "",
                datasheet_url=r["datasheet_url"] or "",
            )
        )
    return ComponentSearchResponse(results=results)


@router.get("/api/v1/components/{component_id}", response_model=ComponentDetailResponse)
async def get_component(component_id: str):
    with db_session() as conn:
        row = conn.execute(
            "SELECT * FROM components WHERE id = ? OR part_number = ?",
            (component_id, component_id),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="元器件不存在")
    return ComponentDetailResponse(component=_row_to_detail(row))
