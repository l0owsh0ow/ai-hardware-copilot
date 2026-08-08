"use client";

import { Database, GraduationCap, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import BackToTop from "@/components/BackToTop";
import InputBox from "@/components/InputBox";
import ToastHost from "@/components/ToastHost";
import TopBar from "@/components/TopBar";
import { parseRequirement } from "@/lib/api";
import { store } from "@/lib/store";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(text: string) {
    setLoading(true);
    setError("");
    try {
      const params = await parseRequirement(text);
      store.setParams(params);
      store.setRecommendations([]);
      store.setSelected([]);
      router.push("/recommend");
    } catch (e) {
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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-gradient-to-r from-brand-50 to-brand-100/60 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-brand-500" />
              AI 驱动 · 已收录 100+ 元器件
            </div>
            <h1 className="mb-3 bg-gradient-to-r from-ink-900 via-ink-800 to-brand-800 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
              描述你的硬件项目需求
            </h1>
            <p className="text-base text-ink-500">用自然语言描述，AI 自动提取参数并推荐元器件方案</p>
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
        </div>
      </div>
      <ToastHost />
      <BackToTop />
    </main>
  );
}
