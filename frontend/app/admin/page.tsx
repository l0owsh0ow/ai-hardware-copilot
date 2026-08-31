"use client";

import {
  BarChart3,
  Database,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import BackToTop from "@/components/BackToTop";
import ToastHost from "@/components/ToastHost";
import TopBar from "@/components/TopBar";
import {
  addAdminComponent,
  deleteAdminComponent,
  fetchAdminComponents,
  fetchAnalyticsSummary,
  rebuildKbIndex,
  updateAdminComponent,
} from "@/lib/api";
import { showToast } from "@/lib/toast";

const CATEGORIES = ["mcu", "sensor", "power", "comm"];

const EMPTY_FORM = {
  part_number: "",
  category: "mcu",
  subcategory: "",
  manufacturer: "",
  description: "",
  package: "",
  price_cny: "1",
  price_unit: "个",
  stock_status: "现货",
  datasheet_url: "",
  supplier: "立创商城",
  supplier_url: "",
  tags: "",
};

interface Row {
  id: string;
  part_number: string;
  category: string;
  manufacturer: string;
  price_cny: number;
  stock_status: string;
  datasheet_url: string;
  [k: string]: unknown;
}

export default function AdminPage() {
  const [tab, setTab] = useState<"kb" | "analytics">("kb");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    today: number;
    funnel: Record<string, number>;
    recent: { event: string; session_id: string; created_at: string }[];
  } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminComponents(q, category, page, 20);
      setRows(data.items as Row[]);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [q, category, page]);

  useEffect(() => {
    load();
  }, [load]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await fetchAnalyticsSummary());
    } catch (e) {
      setError(e instanceof Error ? e.message : "看板加载失败");
    }
  }, []);

  useEffect(() => {
    if (tab === "analytics") loadSummary();
  }, [tab, loadSummary]);

  async function handleSave() {
    const payload: Record<string, unknown> = { ...form };
    payload.price_cny = parseFloat(form.price_cny) || 0;
    payload.tags = form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    try {
      if (editId) {
        await updateAdminComponent(editId, payload);
        showToast("已更新", "success");
      } else {
        await addAdminComponent(payload);
        showToast("已新增，请重建索引使其可被检索", "success");
      }
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    }
  }

  async function handleDelete(id: string, partNumber: string) {
    if (!window.confirm(`确定删除 ${partNumber} 吗？`)) return;
    try {
      await deleteAdminComponent(id);
      showToast("已删除", "info");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  async function handleRebuild() {
    setRebuilding(true);
    try {
      const r = await rebuildKbIndex();
      showToast(r.embedded ? `索引重建完成（${r.count} 条向量）` : "重建失败，已回退关键词检索", r.embedded ? "success" : "error");
    } catch (e) {
      setError(e instanceof Error ? e.message : "重建失败");
    } finally {
      setRebuilding(false);
    }
  }

  const funnelLabels: [string, string][] = [
    ["parse_success", "解析成功"],
    ["recommend_success", "推荐成功"],
    ["rec_card_click", "点击推荐"],
    ["bom_generate", "生成BOM"],
    ["bom_export", "导出"],
  ];

  return (
    <main>
      <TopBar current={0} />
      <div className="mx-auto max-w-6xl px-4 pt-28 pb-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50">
              <Database className="h-5 w-5 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-ink-900">管理后台</h1>
          </div>
          <p className="mb-6 ml-10 text-sm text-ink-500">元器件管理 / 数据看板 / 索引维护</p>

          {error && (
            <div className="mb-4 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </div>
          )}

          <div className="mb-6 flex gap-2">
            {[
              ["kb", "元器件管理", Database],
              ["analytics", "数据看板", BarChart3],
            ].map(([value, label, Icon]) => (
              <button
                key={value as string}
                type="button"
                onClick={() => setTab(value as "kb" | "analytics")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  tab === value
                    ? "bg-brand-600 text-white shadow-[0_8px_18px_rgba(47,107,255,.32)]"
                    : "border border-ink-100 bg-white text-ink-600 hover:bg-ink-50"
                }`}
              >
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Icon className="h-4 w-4" />
                {label as string}
              </button>
            ))}
          </div>

          {tab === "kb" ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    className="w-full rounded-full border border-ink-100 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    placeholder="搜索型号 / 描述 / 标签"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <select
                  className="rounded-full border border-ink-100 bg-white px-3 py-2 text-sm outline-none"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">全部分类</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setEditId(null);
                    setForm(EMPTY_FORM);
                    setShowForm(true);
                  }}
                  className="btn-primary"
                >
                  <span>新增元器件</span>
                  <span className="arr">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleRebuild}
                  disabled={rebuilding}
                  className="btn-secondary text-sm"
                >
                  {rebuilding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  重建索引
                </button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton h-12 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-ink-100 bg-white shadow-lg">
                  <table className="w-full">
                    <thead className="bg-brand-50/70">
                      <tr className="text-left font-mono text-xs text-ink-500">
                        <th className="px-4 py-3">型号</th>
                        <th className="px-4 py-3">分类</th>
                        <th className="px-4 py-3">厂商</th>
                        <th className="px-4 py-3 text-right">价格</th>
                        <th className="px-4 py-3">库存</th>
                        <th className="px-4 py-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {rows.map((r) => (
                        <tr key={r.id} className="transition-colors hover:bg-brand-50/30">
                          <td className="px-4 py-3 text-sm font-semibold text-ink-800">{r.part_number}</td>
                          <td className="px-4 py-3 text-sm text-ink-600">{r.category}</td>
                          <td className="px-4 py-3 text-sm text-ink-600">{r.manufacturer}</td>
                          <td className="px-4 py-3 text-right font-mono text-sm">¥{Number(r.price_cny).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-ink-600">{r.stock_status}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditId(r.id);
                                  setForm({
                                    part_number: String(r.part_number || ""),
                                    category: String(r.category || ""),
                                    subcategory: String(r.subcategory || ""),
                                    manufacturer: String(r.manufacturer || ""),
                                    description: String(r.description || ""),
                                    package: String(r.package || ""),
                                    price_cny: String(r.price_cny ?? ""),
                                    price_unit: String(r.price_unit || "个"),
                                    stock_status: String(r.stock_status || ""),
                                    datasheet_url: String(r.datasheet_url || ""),
                                    supplier: String(r.supplier || ""),
                                    supplier_url: String(r.supplier_url || ""),
                                    tags: Array.isArray(r.tags) ? (r.tags as string[]).join(",") : "",
                                  });
                                  setShowForm(true);
                                }}
                                className="rounded-full p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-600"
                                title="编辑"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(r.id, String(r.part_number))}
                                className="rounded-full p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                                title="删除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
                <span>
                  共 {total} 条 · 第 {page} 页
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-full border border-ink-100 px-3.5 py-1.5 hover:bg-ink-50 disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    disabled={page * 20 >= total}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-full border border-ink-100 px-3.5 py-1.5 hover:bg-ink-50 disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="volt-card p-4">
                  <div className="text-xs text-ink-400">总事件数</div>
                  <div className="mt-1 font-mono text-2xl font-medium text-ink-900">{summary?.total ?? "-"}</div>
                </div>
                <div className="volt-card p-4">
                  <div className="text-xs text-ink-400">今日事件</div>
                  <div className="mt-1 font-mono text-2xl font-medium text-ink-900">{summary?.today ?? "-"}</div>
                </div>
                <div className="volt-card p-4">
                  <div className="text-xs text-ink-400">页面访问</div>
                  <div className="mt-1 font-mono text-2xl font-medium text-ink-900">{summary?.funnel?.page_view ?? "-"}</div>
                </div>
                <div className="volt-card p-4">
                  <div className="text-xs text-ink-400">BOM 导出</div>
                  <div className="mt-1 font-mono text-2xl font-medium text-ink-900">{summary?.funnel?.bom_export ?? "-"}</div>
                </div>
              </div>

              <div className="volt-card p-5">
                <div className="mb-4 text-sm font-semibold text-ink-800">核心漏斗</div>
                <div className="space-y-3">
                  {funnelLabels.map(([ev, label]) => {
                    const count = summary?.funnel?.[ev] ?? 0;
                    const max = Math.max(...funnelLabels.map(([e]) => summary?.funnel?.[e] ?? 0), 1);
                    return (
                      <div key={ev}>
                        <div className="mb-1 flex justify-between text-xs text-ink-500">
                          <span>{label}</span>
                          <span className="font-semibold text-ink-700">{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="volt-card p-5">
                <div className="mb-3 text-sm font-semibold text-ink-800">最近事件</div>
                <div className="space-y-1.5">
                  {(summary?.recent ?? []).map((e, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-ink-50/50 px-3 py-2 text-xs">
                      <span className="font-medium text-ink-700">{e.event}</span>
                      <span className="text-ink-400">
                        {e.session_id.slice(0, 12)} · {e.created_at}
                      </span>
                    </div>
                  ))}
                  {summary && summary.recent.length === 0 && (
                    <div className="py-6 text-center text-sm text-ink-400">还没有事件，去使用一下产品吧</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081226]/55 p-4">
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-[26px] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">{editId ? "编辑元器件" : "新增元器件"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-ink-400 hover:bg-ink-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["part_number", "型号 *", "text"],
                  ["category", "分类", "text"],
                  ["subcategory", "子分类", "text"],
                  ["manufacturer", "厂商", "text"],
                  ["package", "封装", "text"],
                  ["price_cny", "价格(元)", "number"],
                  ["price_unit", "价格单位", "text"],
                  ["stock_status", "库存状态", "text"],
                  ["datasheet_url", "Datasheet 链接", "text"],
                  ["supplier", "供应商", "text"],
                  ["supplier_url", "采购链接", "text"],
                  ["tags", "标签(逗号分隔)", "text"],
                ] as [string, string, string][]
              ).map(([key, label, type]) => (
                <div key={key} className={key === "datasheet_url" || key === "supplier_url" ? "col-span-2" : ""}>
                  <label className="mb-1 block text-xs text-ink-500">{label}</label>
                  <input
                    type={type}
                    className="w-full rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2 text-sm outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                    value={form[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-ink-500">中文描述（影响检索质量）</label>
                <textarea
                  className="w-full rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2 text-sm outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                  rows={3}
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!form.part_number.trim()}
                className="btn-primary"
              >
                <span>保存</span>
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
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastHost />
      <BackToTop />
    </main>
  );
}
