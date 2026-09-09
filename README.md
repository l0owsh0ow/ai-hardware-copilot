# AI硬件选型助手 (HardwareCopilot)

用户用自然语言描述硬件项目需求，AI 自动解析、从知识库检索元器件、生成带推荐理由的 Top5 推荐列表，一键生成 BOM 并导出 Excel/CSV。

## 目录结构

```
ai-hardware-copilot/
├── backend/    # FastAPI 后端（RAG + LLM + BOM）
├── frontend/   # Next.js 14 前端（App Router + TailwindCSS）
├── data/       # 元器件知识库（components_raw.json + build_kb.py）
└── docs/       # 项目文档（交接说明、原型）
```

## 前置环境要求

- **Python ≥ 3.10**：后端 FastAPI + RAG（需能创建虚拟环境）
- **Node.js ≥ 18 + npm**：前端 Next.js 14
- **可选**：本地 Ollama（GLM-4-9B / Qwen2.5-7B）。**不配置也能运行**——默认走内置 `mock` 解析/排序，无需任何 API Key。
- 首次运行会自动下载嵌入模型（sentence-transformers，约 80MB，需联网）；离线时自动退化为关键词检索，仍能产出推荐结果。

## 🚀 零配置一键启动（推荐）

克隆后 **无需配置任何 Key、也无需安装 Ollama**，直接在项目根目录运行：

- **Windows**：双击或运行 `start.bat`
- **macOS / Linux**：`chmod +x start.sh && ./start.sh`

脚本会自动：创建 Python 虚拟环境 → 安装后端/前端依赖 → 复制环境配置（默认 `LLM_PROVIDER=mock`）→ 构建元器件知识库 → 启动后端(8000)与前端(3000)。

打开 `http://localhost:3000`，输入一句话需求（如“做一个低功耗蓝牙温湿度传感器”）即可跑通 输入→解析→推荐→BOM→Excel/CSV 导出 全流程。

> 线下/离线环境：嵌入模型无缓存时会退化为关键词检索；立创实时检索不可用时自动跳过，本地知识库仍可正常推荐。可用 `ENABLE_LCSC=0` 关闭立创检索。

## 快速启动


### 1. 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # 默认 LLM_PROVIDER=mock，无需 API Key
python ../data/build_kb.py       # 导入 100+ 个元器件到 SQLite + ChromaDB
uvicorn app.main:app --reload --port 8000
```

验证：浏览器打开 `http://localhost:8000/docs`（Swagger UI）或 `http://localhost:8000/health`。

> 建议以 `HF_HUB_OFFLINE=1` 启动后端，让嵌入模型走本地缓存、避免联网检查导致回退：
> ```powershell
> $env:HF_HUB_OFFLINE = '1'; uvicorn app.main:app --reload --port 8000
> ```

### 2. 前端

```bash
cd frontend
npm install
cp .env.local.example .env.local # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

打开 `http://localhost:3000`，输入需求即可跑通 输入→解析→推荐→BOM→导出 全流程。

## LLM 配置

开发默认 `LLM_PROVIDER=mock`（规则解析 + 关键词打分，无 API Key 也能跑通）。接入真实模型时在 `backend/.env` 设置：

```
LLM_API_KEY=your_key
LLM_MODEL=claude-sonnet-4-20250514
LLM_PROVIDER=claude   # 或 openai
```

防幻觉机制始终生效：LLM 只能从知识库检索结果中排序选择，型号输出会与 SQLite 交叉验证，知识库外的型号一律丢弃。

## 数据说明

- `data/components_*.json` 共含 100 个元器件（MCU 25 / 传感器 35 / 电源 25 / 通信 15），`build_kb.py` 自动合并导入
- Datasheet 与采购链接为官方/商城地址，价格是快照值，**仅供参考**，上线前建议人工核对一遍

## 测试脚本

```bash
python scripts/smoke_test.py              # 端到端：解析→推荐→BOM→导出→搜索→详情
python scripts/recommend_quality_test.py  # 6 个典型场景的推荐质量检查
```

## 部署

见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)：Vercel（前端）+ Render（后端 Docker，启动时自动构建知识库）。

## 接口一览（Swagger 中可全部调试）

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/v1/parse` | 解析需求文本 → StructuredParams |
| POST | `/api/v1/recommend` | 参数 → RAG 检索 + LLM 排序 → Top5 |
| POST | `/api/v1/bom/generate` | 生成并保存 BOM |
| GET | `/api/v1/bom/{id}/export?format=excel\|csv` | 导出 BOM |
| GET | `/api/v1/components/{id}` | 元器件详情 |
| GET | `/api/v1/components/search?q=&category=` | 元器件搜索 |

## 安全说明（P0 已落地）

- **接口鉴权**：所有 `/api/v1/*` 需携带 `X-API-Token` 请求头（值见 `backend/.env` 的 `API_TOKEN`，前端在 `.env.local` 的 `NEXT_PUBLIC_API_TOKEN`）
- **速率限制**：`/parse` 与 `/recommend` 每 IP 10 次/分钟，其余 API 120 次/分钟（内存版，生产建议 Redis）
- **降级链**：LLM 调用失败自动回退规则模式，响应带 `degraded` 标识，前端显示提示
- **Key 安全**：`backend/.env` 与 `frontend/.env.local` 均已被 git 忽略，不会入库
- **隐私与免责**：首页页脚含数据来源、价格免责与反馈入口

> 本地个人使用足够；若上线对外提供服务，建议升级为账号体系 + Redis 限流 + HTTPS。

## 管理后台与数据看板

- 入口：顶栏数据库图标 → `/admin`（需携带 Token，前端自动）
- 元器件管理：搜索/筛选/分页，新增/编辑/删除元器件，**重建向量索引**（改完数据后执行，使其可被检索）
- 数据看板：总事件/今日事件、核心漏斗（解析→推荐→点击→BOM→导出）、最近事件
- 埋点事件：页面访问、解析、推荐、点击推荐、加入BOM、生成BOM、导出、设置变更等

## 质量与备份

```bash
python scripts/eval_20_scenarios.py   # 20 场景评估集（覆盖课程设计/电赛/毕设）
python scripts/backup_db.py           # 备份 SQLite + 向量库到 backend/backups/
```
