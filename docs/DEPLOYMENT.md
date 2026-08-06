# 部署指南（Vercel + Render）

> 按《开发交接说明》第七步执行。前端免费部署到 Vercel，后端部署到 Render（Docker），知识库在启动时自动构建。

## 1. 后端：Render

### 方式 A：Blueprint 导入（推荐）

1. 把项目推送到 GitHub（如 `ai-hardware-copilot`）。
2. 在 [Render Dashboard](https://dashboard.render.com) 点击 **New → Blueprint**，选择该仓库。
3. Render 会自动读取 `backend/render.yaml` 创建服务。
4. 首次部署后进入服务设置，补充环境变量 `LLM_API_KEY`（接入真实模型时）。

### 方式 B：手动创建 Web Service

1. **New → Web Service**，连接 GitHub 仓库。
2. 配置：
   - Root Directory：`backend`
   - Runtime：`Docker`
   - 或直接使用仓库根目录 + `backend/Dockerfile`（与 Blueprint 一致）
3. 环境变量：

   ```
   LLM_PROVIDER=mock            # 接入真实模型时改为 claude 或 openai
   LLM_API_KEY=                 # 可选，mock 模式不需要
   LLM_MODEL=claude-sonnet-4-20250514
   DATABASE_PATH=/var/data/components.db
   CHROMA_PATH=/var/data/chroma
   CORS_ORIGINS=https://你的前端域名.vercel.app
   ```

4. 如需数据持久化：添加 **Persistent Disk**（付费实例），挂载到 `/var/data`。
   免费实例磁盘不持久，每次部署会由 `start.sh` 自动重建知识库（约 1 分钟）。

### 验证

- 打开 `https://<你的服务名>.onrender.com/health`，应返回 `{"status":"ok",...}`。
- 打开 `/docs` 可调试全部 6 个接口。

## 2. 前端：Vercel

1. 在 [Vercel](https://vercel.com) 点击 **Add New → Project**，导入同一仓库。
2. 项目根目录选择 `frontend`。
3. 环境变量：

   ```
   NEXT_PUBLIC_API_URL=https://<你的后端服务名>.onrender.com
   ```

4. 部署完成后，把域名回填到 Render 的 `CORS_ORIGINS`，然后重新部署后端。

## 3. 接入真实 LLM

在 Render 环境变量中：

```
LLM_PROVIDER=claude        # 或 openai
LLM_API_KEY=sk-ant-...     # 或 sk-...
LLM_MODEL=claude-sonnet-4-20250514
```

防幻觉机制（型号交叉验证）与 LLM 无关，始终生效。

## 4. 成本控制

- Vercel Hobby 免费额度足够。
- Render 免费实例每月 750 小时，休眠后重新唤醒。
- LLM 费用取决于调用量。建议在应用侧对 `/parse` 和 `/recommend` 做每日调用上限（当前版本未内置，如需可后补）。

## 5. 常见问题

| 问题 | 处理 |
|------|------|
| 前端报 CORS 错误 | 检查后端 `CORS_ORIGINS` 是否包含前端完整域名 |
| 首次请求很慢 | 免费实例冷启动 + 模型加载，属正常；建议在 Render 设置 Keep Alive 或定期 ping `/health` |
| 推荐为空 | 确认 `/var/data` 挂载成功且日志中无 `build_kb` 报错 |
| 数据库重建 | 免费实例磁盘不持久，部署后自动重建；如需保留 BOM 记录请用持久磁盘 |
