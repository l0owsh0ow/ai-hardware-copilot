"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import InputBox from "@/components/InputBox";
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
      <div className="mx-auto max-w-[860px] px-6 py-8">
        {error && (
          <div className="mb-4 rounded-xl bg-warn-bg px-4 py-3 text-[13px] text-warn">
            {error}（请确认后端已启动：npm run dev 于 backend 目录）
          </div>
        )}
        <InputBox loading={loading} onSubmit={handleSubmit} />
        <p className="mt-6 text-center text-xs text-muted">
          支持中文/英文需求 · 推荐结果附 Datasheet 链接 · BOM 可导出 Excel / CSV
        </p>
      </div>
    </main>
  );
}
