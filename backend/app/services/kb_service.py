"""知识库管理：元器件增删改查 + 向量索引重建。"""

import json
import re
import uuid
from datetime import datetime

from ..config import get_settings
from ..db import db_session, init_db


def _parse_voltage(value: str) -> tuple[float | None, float | None]:
    if not value:
        return None, None
    nums = re.findall(r"[\d.]+", str(value).replace("V", ""))
    if len(nums) >= 2:
        return float(nums[0]), float(nums[1])
    if len(nums) == 1:
        return float(nums[0]), float(nums[0])
    return None, None


def _to_row(comp: dict) -> dict:
    vmin, vmax = _parse_voltage((comp.get("key_params") or {}).get("working_voltage", ""))
    return {
        "id": comp.get("id") or f"{comp.get('category','other')}-{uuid.uuid4().hex[:8]}",
        "part_number": comp["part_number"],
        "category": comp.get("category", "other"),
        "subcategory": comp.get("subcategory", ""),
        "manufacturer": comp.get("manufacturer", ""),
        "description": comp.get("description", ""),
        "package": comp.get("package", ""),
        "voltage_min": vmin,
        "voltage_max": vmax,
        "price_cny": comp.get("price_cny", 0),
        "price_unit": comp.get("price_unit", "个"),
        "stock_status": comp.get("stock_status", ""),
        "datasheet_url": comp.get("datasheet_url", ""),
        "supplier": comp.get("supplier", ""),
        "supplier_url": comp.get("supplier_url", ""),
        "params_json": json.dumps(comp.get("key_params") or {}, ensure_ascii=False),
        "tags": ",".join(comp.get("tags") or []),
    }


def list_components(q: str = "", category: str = "", page: int = 1, page_size: int = 20) -> tuple[int, list[dict]]:
    conditions = []
    args = []
    if q:
        conditions.append("(part_number LIKE ? OR description LIKE ? OR tags LIKE ?)")
        like = f"%{q}%"
        args += [like, like, like]
    if category:
        conditions.append("category = ?")
        args.append(category)
    where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    with db_session() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM components{where}", args).fetchone()[0]
        rows = conn.execute(
            f"SELECT * FROM components{where} ORDER BY category, part_number LIMIT ? OFFSET ?",
            args + [page_size, (page - 1) * page_size],
        ).fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["key_params"] = json.loads(d.pop("params_json") or "{}")
        d["tags"] = [t for t in (d.pop("tags") or "").split(",") if t]
        items.append(d)
    return total, items


def upsert_component(comp: dict) -> dict:
    row = _to_row(comp)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with db_session() as conn:
        conn.execute(
            """INSERT INTO components (
                id, part_number, category, subcategory, manufacturer, description,
                package, voltage_min, voltage_max, price_cny, price_unit,
                stock_status, datasheet_url, supplier, supplier_url,
                params_json, tags, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
                part_number=excluded.part_number, category=excluded.category,
                subcategory=excluded.subcategory, manufacturer=excluded.manufacturer,
                description=excluded.description, package=excluded.package,
                voltage_min=excluded.voltage_min, voltage_max=excluded.voltage_max,
                price_cny=excluded.price_cny, price_unit=excluded.price_unit,
                stock_status=excluded.stock_status, datasheet_url=excluded.datasheet_url,
                supplier=excluded.supplier, supplier_url=excluded.supplier_url,
                params_json=excluded.params_json, tags=excluded.tags,
                updated_at=excluded.updated_at
            """,
            (
                row["id"], row["part_number"], row["category"], row["subcategory"],
                row["manufacturer"], row["description"], row["package"],
                row["voltage_min"], row["voltage_max"], row["price_cny"], row["price_unit"],
                row["stock_status"], row["datasheet_url"], row["supplier"], row["supplier_url"],
                row["params_json"], row["tags"], now, now,
            ),
        )
    return row


def delete_component(component_id: str) -> bool:
    with db_session() as conn:
        cur = conn.execute("DELETE FROM components WHERE id = ?", (component_id,))
        conn.execute("DELETE FROM component_params WHERE component_id = ?", (component_id,))
    return cur.rowcount > 0


def rebuild_index() -> dict:
    """重建 ChromaDB 向量索引（嵌入模型不可用时跳过，返回计数）。"""
    settings = get_settings()
    with db_session() as conn:
        rows = conn.execute("SELECT * FROM components").fetchall()
    components = []
    for r in rows:
        d = dict(r)
        d["key_params"] = json.loads(d.pop("params_json") or "{}")
        d["tags"] = [t for t in (d.pop("tags") or "").split(",") if t]
        components.append(d)
    if not components:
        return {"ok": True, "count": 0, "embedded": False, "message": "知识库为空"}
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(settings.embedding_model)
        client = chromadb.PersistentClient(path=settings.resolve_chroma_path())
        try:
            client.delete_collection("components")
        except Exception:
            pass
        collection = client.get_or_create_collection("components")
        ids = [c["id"] for c in components]
        documents = [c["description"] for c in components]
        metadatas = [
            {
                "category": c.get("category", ""),
                "subcategory": c.get("subcategory", ""),
                "manufacturer": c.get("manufacturer", ""),
                "voltage_max": c.get("voltage_max"),
                "price_cny": c.get("price_cny"),
            }
            for c in components
        ]
        embeddings = model.encode(documents).tolist()
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)
        return {"ok": True, "count": len(components), "embedded": True}
    except Exception as exc:
        return {"ok": False, "count": len(components), "embedded": False, "error": str(exc)[:200]}
