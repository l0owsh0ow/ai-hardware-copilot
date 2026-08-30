"""SQLite 数据访问层：连接管理 + 建表。"""

import os
import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import get_settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    part_number TEXT UNIQUE,
    category TEXT NOT NULL,
    subcategory TEXT,
    manufacturer TEXT,
    description TEXT,
    package TEXT,
    voltage_min REAL,
    voltage_max REAL,
    price_cny REAL,
    price_unit TEXT,
    stock_status TEXT,
    datasheet_url TEXT,
    supplier TEXT,
    supplier_url TEXT,
    params_json TEXT,
    tags TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS component_params (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_id TEXT NOT NULL,
    param_name TEXT NOT NULL,
    param_value TEXT,
    param_unit TEXT,
    FOREIGN KEY (component_id) REFERENCES components(id)
);

CREATE TABLE IF NOT EXISTS bom_records (
    id TEXT PRIMARY KEY,
    project_name TEXT,
    user_session TEXT,
    total_cost REAL,
    created_at TEXT,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS bom_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bom_id TEXT NOT NULL,
    component_id TEXT,
    part_number TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price REAL,
    subtotal REAL,
    FOREIGN KEY (bom_id) REFERENCES bom_records(id),
    FOREIGN KEY (component_id) REFERENCES components(id)
);

-- 历史记录表：只存紧凑摘要，查看历史不调用 LLM
CREATE TABLE IF NOT EXISTS history_records (
    id TEXT PRIMARY KEY,
    title TEXT,                 -- 应用名称，如"温湿度监测"
    query_text TEXT,            -- 原始需求（截断保存）
    params_json TEXT,           -- 结构化参数（紧凑 JSON）
    recommendations_json TEXT,  -- 推荐结果（不含长推荐理由）
    created_at TEXT
);

-- 应用设置表（如 LLM 配置：provider/model/base_url/api_key）
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT
);
"""


def get_connection() -> sqlite3.Connection:
    settings = get_settings()
    path = settings.resolve_database_path()
    # 确保 data 目录存在
    data_dir = os.path.dirname(path)
    if data_dir and not os.path.isdir(data_dir):
        os.makedirs(data_dir, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db_session() -> Iterator[sqlite3.Connection]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with db_session() as conn:
        conn.executescript(SCHEMA_SQL)


def row_to_component_dict(row: sqlite3.Row) -> dict:
    """将 components 行转为 API 输出用的字典（展开 params_json/tags）。"""
    import json

    data = dict(row)
    data["key_params"] = json.loads(data.pop("params_json") or "{}")
    data["tags"] = [t for t in (data.pop("tags") or "").split(",") if t]
    return data
