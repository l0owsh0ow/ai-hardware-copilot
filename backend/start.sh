#!/usr/bin/env bash
set -e

# 定位到项目根目录（backend/ 的上一级）
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 首次启动时构建知识库（SQLite + ChromaDB）
if [ ! -f "$DATABASE_PATH" ] || [ ! -d "$CHROMA_PATH" ]; then
  echo "[start] 知识库不存在，开始构建（约 1 分钟）..."
  python data/build_kb.py
fi

cd "$ROOT/backend"
echo "[start] 启动 API 服务..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
