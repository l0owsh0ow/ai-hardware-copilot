#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
echo "============================================"
echo "  AI硬件选型助手 一键启动 (零配置)"
echo "============================================"
echo "[1/4] 准备 Python 虚拟环境..."
[ -d backend/.venv ] || python3 -m venv backend/.venv
echo "[2/4] 安装后端依赖..."
backend/.venv/bin/python -m pip install -q -r backend/requirements.txt --disable-pip-version-check
echo "[3/4] 安装前端依赖..."
[ -d frontend/node_modules ] || npm install --prefix frontend --no-audit --no-fund
echo "[4/4] 生成环境配置与知识库..."
[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -f frontend/.env.local ] || cp frontend/.env.local.example frontend/.env.local
backend/.venv/bin/python data/build_kb.py
echo "启动服务（后端 8000 / 前端 3000）..."
(cd backend && HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000) &
(cd frontend && npm run dev) &
echo "后端文档: http://localhost:8000/docs"
echo "前端页面: http://localhost:3000"
wait
