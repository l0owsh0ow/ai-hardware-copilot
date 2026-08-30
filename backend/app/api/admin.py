"""后台管理接口：元器件 CRUD + 索引重建。"""

from fastapi import APIRouter, HTTPException, Query

from ..models.schemas import AdminComponentListResponse, AdminComponentUpdate
from ..services import kb_service

router = APIRouter()


@router.get("/api/v1/admin/components", response_model=AdminComponentListResponse)
async def admin_list_components(
    q: str = Query(""),
    category: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    total, items = kb_service.list_components(q, category, page, page_size)
    return AdminComponentListResponse(total=total, items=items)


@router.post("/api/v1/admin/components")
async def admin_add_component(comp: dict):
    if not comp.get("part_number"):
        raise HTTPException(status_code=400, detail="part_number 必填")
    row = kb_service.upsert_component(comp)
    return {"ok": True, "id": row["id"], "part_number": row["part_number"]}


@router.put("/api/v1/admin/components/{component_id}")
async def admin_update_component(component_id: str, req: AdminComponentUpdate):
    from ..db import db_session
    import json as _json

    updates = {}
    for field, value in req.model_dump(exclude_none=True).items():
        if field == "key_params":
            updates["params_json"] = _json.dumps(value, ensure_ascii=False)
        elif field == "tags":
            updates["tags"] = value
        else:
            updates[field] = value
    if not updates:
        raise HTTPException(status_code=400, detail="没有可更新的字段")
    sets = ", ".join(f"{k}=?" for k in updates)
    with db_session() as conn:
        cur = conn.execute(
            f"UPDATE components SET {sets}, updated_at=datetime('now') WHERE id = ?",
            list(updates.values()) + [component_id],
        )
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="元器件不存在")
    return {"ok": True}


@router.delete("/api/v1/admin/components/{component_id}")
async def admin_delete_component(component_id: str):
    if not kb_service.delete_component(component_id):
        raise HTTPException(status_code=404, detail="元器件不存在")
    return {"ok": True}


@router.post("/api/v1/admin/kb/rebuild")
async def admin_rebuild_index():
    return kb_service.rebuild_index()
