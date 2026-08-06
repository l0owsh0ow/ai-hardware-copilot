"""知识库构建脚本：components_raw.json → SQLite + ChromaDB。

用法（在 backend 目录下执行，或设置 PYTHONPATH）:
    python ../data/build_kb.py
    python ../data/build_kb.py --rebuild

说明：
- --rebuild 会清空并重建 SQLite 中的 components 表与 ChromaDB 集合
- 嵌入模型(sentence-transformers)不可用时会跳过向量写入并提示
"""

import argparse
import glob
import json
import os
import re
import sys
import uuid
from datetime import datetime

# 允许从 backend 目录直接运行
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.config import get_settings  # noqa: E402
from app.db import db_session, init_db  # noqa: E402

DATA_DIR = os.path.dirname(__file__)


def load_components() -> list[dict]:
    """加载 data/ 下所有 components_*.json，按 id 去重合并。"""
    components: list[dict] = []
    seen: set[str] = set()
    for path in sorted(glob.glob(os.path.join(DATA_DIR, "components_*.json"))):
        with open(path, encoding="utf-8") as f:
            items = json.load(f)
        print(f"[load] {os.path.basename(path)}: {len(items)} 条")
        for comp in items:
            if comp.get("id") in seen:
                print(f"[warn] 重复 id 已跳过: {comp.get('id')}")
                continue
            seen.add(comp["id"])
            components.append(comp)
    return components


def validate_components(components: list[dict]) -> None:
    """校验必填字段与唯一性。"""
    required = [
        "id", "part_number", "category", "manufacturer", "description",
        "key_params", "price_cny", "datasheet_url",
    ]
    errors = []
    part_numbers: set[str] = set()
    for comp in components:
        for field in required:
            if field not in comp or comp[field] in (None, ""):
                errors.append(f"{comp.get('id', '?')} 缺少字段: {field}")
        if comp.get("part_number") in part_numbers:
            errors.append(f"型号重复: {comp.get('part_number')}")
        part_numbers.add(comp.get("part_number"))
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"[ok] 校验通过：必填字段完整，型号无重复")


def parse_voltage(value: str) -> tuple[float | None, float | None]:
    """从 '1.7-3.6V' 这类字符串解析电压范围。"""
    if not value:
        return None, None
    nums = re.findall(r"[\d.]+", value.replace("V", ""))
    if len(nums) >= 2:
        return float(nums[0]), float(nums[1])
    if len(nums) == 1:
        return float(nums[0]), float(nums[0])
    return None, None


def upsert_component(conn, comp: dict) -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    vmin, vmax = parse_voltage(
        comp.get("key_params", {}).get("working_voltage", "")
    )
    conn.execute(
        """INSERT INTO components (
            id, part_number, category, subcategory, manufacturer, description,
            package, voltage_min, voltage_max, price_cny, price_unit,
            stock_status, datasheet_url, supplier, supplier_url,
            params_json, tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            part_number=excluded.part_number,
            category=excluded.category,
            subcategory=excluded.subcategory,
            manufacturer=excluded.manufacturer,
            description=excluded.description,
            package=excluded.package,
            voltage_min=excluded.voltage_min,
            voltage_max=excluded.voltage_max,
            price_cny=excluded.price_cny,
            price_unit=excluded.price_unit,
            stock_status=excluded.stock_status,
            datasheet_url=excluded.datasheet_url,
            supplier=excluded.supplier,
            supplier_url=excluded.supplier_url,
            params_json=excluded.params_json,
            tags=excluded.tags,
            updated_at=excluded.updated_at
        """,
        (
            comp["id"],
            comp["part_number"],
            comp["category"],
            comp.get("subcategory", ""),
            comp.get("manufacturer", ""),
            comp.get("description", ""),
            comp.get("package", ""),
            vmin,
            vmax,
            comp.get("price_cny", 0),
            comp.get("price_unit", "个"),
            comp.get("stock_status", ""),
            comp.get("datasheet_url", ""),
            comp.get("supplier", ""),
            comp.get("supplier_url", ""),
            json.dumps(comp.get("key_params", {}), ensure_ascii=False),
            ",".join(comp.get("tags", [])),
            now,
            now,
        ),
    )

    # 参数表：先删后插
    conn.execute("DELETE FROM component_params WHERE component_id = ?", (comp["id"],))
    for name, value in (comp.get("key_params") or {}).items():
        if isinstance(value, (list, dict, bool)):
            value = json.dumps(value, ensure_ascii=False)
        conn.execute(
            "INSERT INTO component_params (component_id, param_name, param_value, param_unit)"
            " VALUES (?, ?, ?, '')",
            (comp["id"], name, str(value)),
        )


def rebuild_tables(conn) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS bom_items;
        DROP TABLE IF EXISTS bom_records;
        DROP TABLE IF EXISTS component_params;
        DROP TABLE IF EXISTS components;
        """
    )
    init_db()


def write_chroma(components: list[dict], rebuild: bool) -> None:
    settings = get_settings()
    try:
        import chromadb
    except ImportError:
        print("[skip] chromadb 未安装，跳过向量索引写入")
        return

    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(settings.embedding_model)
    except Exception as exc:
        print(f"[warn] 嵌入模型不可用({exc})，跳过向量索引写入（检索将使用关键词回退）")
        return

    client = chromadb.PersistentClient(path=settings.resolve_chroma_path())
    if rebuild:
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
    print(f"[ok] 已写入 {len(ids)} 条向量到 ChromaDB（384维）")


def main() -> None:
    parser = argparse.ArgumentParser(description="构建元器件知识库")
    parser.add_argument("--rebuild", action="store_true", help="清空重建数据库")
    args = parser.parse_args()

    components = load_components()
    validate_components(components)

    # 品类统计
    from collections import Counter

    category_count = Counter(c["category"] for c in components)
    print("[info] 品类分布: " + ", ".join(f"{k}={v}" for k, v in sorted(category_count.items())))

    init_db()
    with db_session() as conn:
        if args.rebuild:
            rebuild_tables(conn)
        for comp in components:
            upsert_component(conn, comp)
        count = conn.execute("SELECT COUNT(*) FROM components").fetchone()[0]
    print(f"[ok] SQLite 元器件数量: {count}")

    write_chroma(components, rebuild=args.rebuild)
    print("完成。")


if __name__ == "__main__":
    main()
