"use client";

import {
  ArrowLeft,
  Clock,
  FileText,
  History,
  Layers,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import BackToTop from "@/components/BackToTop";
import ParamCard from "@/components/ParamCard";
import RecommendCard from "@/components/RecommendCard";
import ToastHost from "@/components/ToastHost";
import TopBar from "@/components/TopBar";
import { clearHistory, deleteHistory, fetchHistoryDetail, fetchHistoryList } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { CATEGORY_LABELS } from "@/lib/store";
import type { HistoryDetail, HistoryListItem } from "@/lib/types";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchHistoryList());
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function openDetail(id: string) {
    setError("");
    try {
      setDetail(await fetchHistoryDetail(id));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载详情失败");
    }
  }

  async function remove(id: string) {
    try {
      await deleteHistory(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      showToast("已删除", "info");
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  async function clearAll() {
    if (!window.confirm("确定清空全部历史记录吗？此操作不可恢复。")) return;
    try {
      await clearHistory();
      setItems([]);
      showToast("已清空全部历史", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "清空失败");
    }
  }

  return (
    <main>
      <TopBar current={0} />
      <div className="mx-auto max-w-6xl px-4 pt-28 pb-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-4 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </div>
          )}

          {detail ? (
            <>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="btn-secondary mb-4 !py-2 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                返回历史列表
              </button>
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50">
                  <Layers className="h-5 w-5 text-brand-600" />
                </div>
                <h1 className="text-2xl font-bold text-ink-900">{detail.title}</h1>
              </div>
              <div className="mb-6 ml-10 flex flex-wrap items-center gap-3 text-xs text-ink-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {detail.created_at}
                </span>
                <span>{detail.query_text}</span>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["应用场景", detail.params.application],
                  ["供电方式", detail.params.power_supply],
                  ["通信方式", (detail.params.communication || []).join(" / ")],
                  ["接口类型", (detail.params.interface || []).join(" / ")],
                ].map(([name, value]) => (
                  <ParamCard key={name} name={name} value={value} />
                ))}
              </div>

              <div className="space-y-3">
                {detail.recommendations.map((rec) => (
                  <RecommendCard
                    key={rec.id}
                    component={rec}
                    selected={false}
                    onToggle={() => {}}
                    readonly
                  />
                ))}
              </div>
              {detail.recommendations.length === 0 && (
                <div className="volt-card px-5 py-10 text-center text-sm text-ink-500">
                  该记录没有保存推荐结果
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50">
                  <History className="h-5 w-5 text-brand-600" />
                </div>
                <h1 className="text-2xl font-bold text-ink-900">历史方案</h1>
              </div>
              <p className="mb-6 ml-10 text-sm text-ink-500">
                查看历史记录不消耗 token，数据保存在本地数据库
              </p>

              <div className="mb-6 flex justify-end">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={items.length === 0}
                  className="btn-secondary !py-2 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  清空历史
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="volt-card p-5">
                      <div className="skeleton mb-2 h-4 w-32 rounded-full" />
                      <div className="skeleton h-3 w-3/4 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="volt-card px-5 py-14 text-center">
                  <div className="mb-2 text-sm font-medium text-ink-700">还没有历史记录</div>
                  <p className="mb-4 text-xs text-ink-400">
                    去输入一次需求并生成推荐，系统会自动保存到这里
                  </p>
                  <Link
                    href="/"
                    className="btn-primary"
                  >
                    <span>去选型</span>
                    <span className="arr">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 17 17 7M9 7h8v8" />
                      </svg>
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="card-hover volt-card flex items-center justify-between p-5"
                    >
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => openDetail(it.id)}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink-900">{it.title}</span>
                          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                            {it.count} 个元件
                          </span>
                        </div>
                        <div className="mb-1 line-clamp-1 text-xs text-ink-400">{it.query_text}</div>
                        <div className="flex items-center gap-1 text-xs text-ink-400">
                          <Clock className="h-3 w-3" />
                          {it.created_at}
                        </div>
                      </button>
                      <div className="ml-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openDetail(it.id)}
                          className="btn-secondary !py-1.5 text-xs"
                        >
                          <FileText className="h-3 w-3" />
                          查看
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(it.id)}
                          className="inline-flex items-center gap-1 rounded-full p-2 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ToastHost />
      <BackToTop />
    </main>
  );
}
