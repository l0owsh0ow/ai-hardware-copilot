# 本地 AI 技术方案（Ollama / llama.cpp）

> 状态：代码已完成，等待本地模型运行时就位。

## 〇、Ollama 就绪清单（用户自行安装官网版后）

1. 安装完成后确认：`ollama --version`
2. 确认模型目录已指向 D 盘：`echo $env:OLLAMA_MODELS`（应显示 `D:\OllamaModels`；若为空执行 `setx OLLAMA_MODELS "D:\OllamaModels"` 并重开终端）
3. 拉取模型：`ollama pull qwen3:4b`（约 2-3GB，会下载到 D:\OllamaModels）
4. 验证：`ollama list` 能看到 qwen3:4b
5. 把结果告诉我，我会：
   - 在个人主页把供应商切到"本地模型"、模型填 `qwen3:4b`、Base URL 填 `http://localhost:11434/v1/chat/completions`
   - 跑 `python scripts/local_model_quality_test.py 本地Qwen3-4B` 与 DeepSeek 基线对比

> 备选：如果官网安装包也下载不动，可用 llama.cpp 方案（pip install llama-cpp-python + hf-mirror 下载 GGUF），接口完全兼容。

## 一、判断结论

**本地小模型够用**：产品只有两个 LLM 任务（结构化解析 + 候选排序/短理由），非复杂推理；RTX 4060 8GB 可跑 Qwen3-4B（Q4 约 2.5GB，40-60 token/s）或 Qwen2.5-7B（约 4.5GB）。

- 首选：Qwen3-4B（中文强、速度快、8GB 显存无压力）
- 备选：Qwen2.5-7B-Instruct（质量更稳、速度稍慢）
- 不建议 <2B（JSON 输出不稳定）

## 二、架构

```
个人主页(/profile) 配置 → SQLite app_settings → llm_service 动态读取
                                          ↓
供应商: mock / local / deepseek / openai / claude / custom
                                          ↓
local/custom 走 OpenAI 兼容接口 → http://localhost:11434/v1/chat/completions
```

## 三、已完成部分

- 后端：`app_settings` 表、设置接口（查看/保存/测试连接，Key 打码）、`llm_service` 动态配置 + local/custom 供应商
- 前端：`/profile` 页面（供应商选择、Base URL、模型名、API Key、测试连接、保存）
- 验证：设置接口通过；DeepSeek 测试 586ms；本地未就绪时正确报错

## 四、质量验证方案

`python scripts/local_model_quality_test.py <标签>` 跑 6 个典型场景：

- 成功数/总数（解析+推荐是否可用）
- 平均耗时
- 推荐型号是否合理（人工判断）

对比方法：先用 DeepSeek 跑出基线，再切本地模型跑一次，对比 成功率/耗时/推荐合理度。

## 五、性能优化（小模型专项）

- 排序候选信息压缩：只传 型号/品类/厂商/核心参数，不传全文描述 → 省 token 提速
- few-shot prompt：给 1-2 个 JSON 示例 → 提高格式稳定性
- JSON 容错解析：现有 `_extract_json` 兜底（剥代码围栏、从首 `{`/`[` 截取）
- Ollama `keep_alive` 常驻，避免每次重新加载模型

## 六、成本与隐私

- 本地推理：零 token 成本、数据不出本机
- API 模式：按量计费，可随时在个人主页切换
- Key 只存本地 SQLite，不进 git、不上传
