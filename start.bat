@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo ============================================
echo   AI硬件选型助手 一键启动 (零配置)
echo ============================================
echo.
echo [1/4] 准备 Python 虚拟环境 ...
if not exist "backend\.venv" (
  where py >nul 2>nul
  if not errorlevel 1 (
    py -3 -m venv backend\.venv
  ) else (
    python -m venv backend\.venv
  )
)
echo [2/4] 安装后端依赖 ...
"backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt" --disable-pip-version-check -q
echo [3/4] 安装前端依赖 ...
if not exist "frontend\node_modules" (
  call npm.cmd install --prefix frontend --no-audit --no-fund
)
echo [4/4] 生成环境配置与知识库 ...
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul
if not exist "frontend\.env.local" copy "frontend\.env.local.example" "frontend\.env.local" >nul
echo 正在构建元器件知识库（首次约 1 分钟）...
"backend\.venv\Scripts\python.exe" "data\build_kb.py"
echo.
echo 启动服务（后端 8000 / 前端 3000）...
start "hwcopilot-backend" cmd /k "cd /d ""%~dp0backend"" && set HF_HUB_OFFLINE=1 && set TRANSFORMERS_OFFLINE=1 && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "hwcopilot-frontend" cmd /k "cd /d ""%~dp0frontend"" && npm.cmd run dev"
echo.
echo 后端文档: http://localhost:8000/docs
echo 前端页面: http://localhost:3000
echo 请在浏览器打开 http://localhost:3000 体验
endlocal