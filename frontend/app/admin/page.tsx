"use client";

import { BarChart3, Database, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import BackToTop from "@/components/BackToTop";
import ToastHost from "@/components/ToastHost";
import TopBar from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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

  function openEdit(r: Row) {
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
            <div className="volt-aurora flex h-8 w-8 items-center justify-center rounded-xl">
              <Database className="h-5 w-5 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-ink-900">管理后台</h1>
          </div>
          <p className="mb-6 ml-10 text-sm text-ink-500">元器件管理 / 数据看板 / 索引维护</p>

          {error && (
            <div className="mb-4 rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
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
                    ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-[0_8px_18px_rgba(47,107,255,.32)]"
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
                <div className="relative min-w-48 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Input
                    className="bg-white pl-9"
                    placeholder="搜索型号 / 描述 / 标签"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <Select
                  value={category || "all"}
                  onValueChange={(v) => {
                    setCategory(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-32 bg-white">
                    <SelectValue placeholder="全部分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => {
                    setEditId(null);
                    setForm(EMPTY_FORM);
                    setShowForm(true);
                  }}
                  className="rounded-full px-4"
                >
                  <Plus />
                  新增元器件
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRebuild}
                  disabled={rebuilding}
                  className="rounded-full"
                >
                  {rebuilding ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  重建索引
                </Button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton h-12 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <Card className="overflow-hidden border-ink-100 shadow-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-brand-50/70 hover:bg-brand-50/70">
                        <TableHead className="font-mono text-xs">型号</TableHead>
                        <TableHead className="font-mono text-xs">分类</TableHead>
                        <TableHead className="font-mono text-xs">厂商</TableHead>
                        <TableHead className="text-right font-mono text-xs">价格</TableHead>
                        <TableHead className="font-mono text-xs">库存</TableHead>
                        <TableHead className="text-right font-mono text-xs">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id} className="transition-colors hover:bg-brand-50/30">
                          <TableCell className="font-mono text-sm font-semibold text-ink-800">
                            {r.part_number}
                          </TableCell>
                          <TableCell className="text-sm text-ink-600">{r.category}</TableCell>
                          <TableCell className="text-sm text-ink-600">{r.manufacturer}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            ¥{Number(r.price_cny).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm text-ink-600">{r.stock_status}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="编辑">
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(r.id, String(r.part_number))}
                                title="删除"
                                className="text-ink-400 hover:text-danger-600"
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}

              <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
                <span>
                  共 {total} 条 · 第 {page} 页
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page * 20 >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["总事件数", summary?.total],
                  ["今日事件", summary?.today],
                  ["页面访问", summary?.funnel?.page_view],
                  ["BOM 导出", summary?.funnel?.bom_export],
                ].map(([label, value]) => (
                  <Card key={label as string} className="border-ink-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="text-xs text-ink-400">{label}</div>
                      <div className="mt-1 font-mono text-2xl font-medium text-ink-900">
                        {value ?? "-"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-ink-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">核心漏斗</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-ink-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">最近事件</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {(summary?.recent ?? []).map((e, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-ink-50/70 px-3 py-2 text-xs">
                      <span className="font-medium text-ink-700">{e.event}</span>
                      <span className="font-mono text-ink-400">
                        {e.session_id.slice(0, 12)} / {e.created_at}
                      </span>
                    </div>
                  ))}
                  {summary && summary.recent.length === 0 && (
                    <div className="py-6 text-center text-sm text-ink-400">还没有事件，去使用一下产品吧</div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? "编辑元器件" : "新增元器件"}</DialogTitle>
            <DialogDescription>
              中文描述会直接影响向量检索质量，请尽量写清楚。
            </DialogDescription>
          </DialogHeader>
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
                <Input
                  type={type}
                  className="bg-ink-50/40 focus:bg-white"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-ink-500">中文描述（影响检索质量）</label>
              <Textarea
                className="bg-ink-50/40 focus:bg-white"
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-full">
              取消
            </Button>
            <Button type="button" onClick={handleSave} disabled={!form.part_number.trim()} className="rounded-full px-5">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ToastHost />
      <BackToTop />
    </main>
  );
}
