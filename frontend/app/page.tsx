"use client";

import { Database, GraduationCap, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import BackToTop from "@/components/BackToTop";
import InputBox from "@/components/InputBox";
import ToastHost from "@/components/ToastHost";
import TopBar from "@/components/TopBar";
import { Badge } from "@/components/ui/badge";
import { parseRequirement } from "@/lib/api";
import { track } from "@/lib/analytics";
import { store } from "@/lib/store";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(text: string) {
    setLoading(true);
    setError("");
    track("parse_start");
    try {
      const { params, degraded } = await parseRequirement(text);
      track("parse_success", { degraded });
      store.setParams(params);
      store.setDegraded(degraded);
      store.setQuery(text);
      store.setRecommendations([]);
      store.setSelected([]);
      router.push("/recommend");
    } catch (e) {
      track("parse_fail");
      setError(e instanceof Error ? e.message : "解析失败，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <main>
      <TopBar current={1} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 animate-slide-up text-center">
            <Badge variant="outline" className="mb-4 gap-2 border-brand-100 bg-gradient-to-r from-brand-50 to-brand-100/60 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-brand-500" />
              AI 驱动 · 已收录 100+ 元器件
            </Badge>
            <h1 className="mb-3 text-4xl font-semibold tracking-tight text-ink-900 md:text-5xl">
              描述你的硬件项目需求
            </h1>
            <p className="text-lg text-ink-500">用自然语言描述，AI 自动提取参数并推荐元器件方案</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}（请确认后端已启动：python -m uvicorn app.main:app --port 8000）
            </div>
          )}

          <InputBox loading={loading} onSubmit={handleSubmit} />

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-ink-400">
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              100+ 元器件知识库
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              3 分钟出 BOM
            </div>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              专为电子专业学生设计
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-1.5 border-t border-ink-200 pt-5 text-center text-[11px] leading-relaxed text-ink-400">
            <p>
              数据来源：立创商城 / 嘉立创 / 厂商官方 Datasheet · 价格仅供参考，请以实际采购为准
            </p>
            <p>
              本地运行模式数据不出本机；使用云端 API 时需求文本将发送至所选 AI 服务商。
            </p>
            <a
              href="mailto:juha75915@gmail.com?subject=AI硬件选型助手反馈"
              className="text-brand-600 hover:text-brand-700"
            >
              反馈问题 / 提交缺失元器件
            </a>
          </div>
        </div>
      </div>
      <ToastHost />
      <BackToTop />
    </main>
  );
}
