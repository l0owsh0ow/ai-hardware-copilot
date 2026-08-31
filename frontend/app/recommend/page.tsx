"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BatteryCharging,
  Brain,
  Check,
  Cpu,
  FileSpreadsheet,
  Layers,
  ListPlus,
  Radio,
  ShieldCheck,
  Thermometer,
  Timer,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BackToTop from "@/components/BackToTop";
import BackButton from "@/components/BackButton";
import ParamCard from "@/components/ParamCard";
import RecommendCard from "@/components/RecommendCard";
import SkeletonCards from "@/components/SkeletonCards";
import ToastHost from "@/components/ToastHost";
import TopBar from "@/components/TopBar";
import { fetchRecommendations, generateBom, saveHistory } from "@/lib/api";
import { track } from "@/lib/analytics";
import { showToast } from "@/lib/toast";
import { CATEGORY_LABELS, store } from "@/lib/store";
import type { Component, StructuredParams } from "@/lib/types";

const PARAM_FIELDS: { key: keyof StructuredParams; label: string }[] = [
  { key: "application", label: "应用场景" },
  { key: "power_supply", label: "供电方式" },
  { key: "power_consumption", label: "功耗要求" },
  { key: "duration", label: "工作时长" },
  { key: "voltage", label: "工作电压" },
  { key: "budget", label: "预算限制" },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mcu: Cpu,
  sensor: Thermometer,
  power: BatteryCharging,
  comm: Radio,
};

export default function RecommendPage() {
  const router = useRouter();
  const [params, setParams] = useState<StructuredParams | null>(null);
  const [recommendations, setRecommendations] = useState<Component[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"params" | "recs">("params");
  const [filter, setFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = store.getParams();
    if (!p) {
      router.replace("/");
      return;
    }
    setParams(p);
    const recs = store.getRecommendations() || [];
    setRecommendations(recs);
    setSelected(new Set(store.getSelected()));
    if (recs.length > 0) setStage("recs");
  }, [router]);

  function updateParam(key: keyof StructuredParams, value: string | string[]) {
    setParams((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      store.setParams(next);
      return next;
    });
  }

  async function handleRecommend() {
    if (!params) return;
    setLoading(true);
    setError("");
    track("recommend_start");
    try {
      const { recommendations: recs, degraded } = await fetchRecommendations(params);
      track("recommend_success", { count: recs.length, degraded });
      setRecommendations(recs);
      store.setRecommendations(recs);
      store.setDegraded(degraded);
      // 自动存档历史（纯数据库，查看时不消耗 token）
      saveHistory({
        title: params.application || store.getQuery().slice(0, 20) || "未命名方案",
        query_text: store.getQuery(),
        params,
        recommendations: recs,
      }).catch(() => {
        /* 存档失败不影响主流程 */
      });
      setFilter("all");
      setStage("recs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "推荐失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(c: Component) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) {
        next.delete(c.id);
        track("select_component", { part_number: c.part_number, action: "remove" });
        showToast("已移出 BOM", "info");
      } else {
        next.add(c.id);
        track("select_component", { part_number: c.part_number, action: "add" });
        showToast("已加入 BOM", "success");
      }
      store.setSelected([...next]);
      return next;
    });
  }

  function handleSelectAll() {
    if (recommendations.length === 0) return;
    const allSelected = recommendations.every((r) => selected.has(r.id));
    if (allSelected) {
      setSelected(new Set());
      store.setSelected([]);
      showToast("已清空 BOM 选择", "info");
    } else {
      const next = new Set(recommendations.map((r) => r.id));
      track("select_all", { count: recommendations.length });
      setSelected(next);
      store.setSelected([...next]);
      showToast(`已将 ${recommendations.length} 个元器件全部加入 BOM`, "success");
    }
  }

  async function handleGenerateBom() {
    const items = recommendations.filter((r) => selected.has(r.id));
    if (items.length === 0) {
      showToast("请先选择至少一个元器件加入 BOM", "error");
      return;
    }
    setLoading(true);
    track("bom_generate", { count: items.length });
    try {
      const bom = await generateBom(
        items.map((r) => ({ part_number: r.part_number, quantity: 1 })),
        params?.application || "未命名项目"
      );
      store.setBom(bom);
      router.push("/bom");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成 BOM 失败");
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    let list = recommendations;
    if (filter !== "all") list = list.filter((r) => r.category === filter);
    if (sortAsc) list = [...list].sort((a, b) => a.match_score - b.match_score);
    const groups = new Map<string, Component[]>();
    for (const rec of list) {
      if (!groups.has(rec.category)) groups.set(rec.category, []);
      groups.get(rec.category)!.push(rec);
    }
    return groups;
  }, [recommendations, filter, sortAsc]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of recommendations) map.set(r.category, (map.get(r.category) || 0) + 1);
    return map;
  }, [recommendations]);

  // 置信度取推荐结果的真实平均匹配度，不写死
  const confidence = useMemo(() => {
    if (recommendations.length === 0) return null;
    return Math.round(
      (recommendations.reduce((sum, r) => sum + r.match_score, 0) / recommendations.length) * 100
    );
  }, [recommendations]);

  if (!params) {
    return (
      <main>
        <TopBar current={2} />
        <div className="mx-auto max-w-6xl px-6 pt-28 text-center text-sm text-ink-500">加载中...</div>
      </main>
    );
  }

  const currentStep = stage === "recs" ? 3 : 2;

  return (
    <main>
      <TopBar current={currentStep} />
      <div className="mx-auto max-w-6xl px-4 pt-28 pb-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {stage === "params" ? (
            <BackButton label="返回首页" fallback="/" />
          ) : (
            <button
              type="button"
              onClick={() => {
                setStage("params");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="btn-secondary mb-4 !py-2 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回参数确认
            </button>
          )}
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-50">
              <Check className="h-5 w-5 text-success-600" />
            </div>
            <h1 className="text-2xl font-bold text-ink-900">AI 解析完成</h1>
          </div>
          <p className="mb-6 ml-10 text-sm text-ink-500">请确认以下参数是否准确，可点击数值修改</p>

          {error && (
            <div className="mb-4 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </div>
          )}

          {store.getDegraded() && (
            <div className="mb-4 rounded-xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700">
              AI 服务暂不可用，当前使用规则模式（解析与推荐由规则引擎完成）
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-white px-3.5 py-1.5 text-xs text-ink-600 shadow-sm">
              <Layers className="h-3.5 w-3.5 text-brand-500" />
              识别到 <b className="mx-0.5 text-brand-600">{counts.size || 4}</b> 个元器件需求
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-white px-3.5 py-1.5 text-xs text-ink-600 shadow-sm">
              <Timer className="h-3.5 w-3.5 text-brand-500" />
              预计 <b className="mx-0.5 text-brand-600">3</b> 分钟完成选型
            </div>
            {params.budget && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-white px-3.5 py-1.5 text-xs text-ink-600 shadow-sm">
                <Wallet className="h-3.5 w-3.5 text-brand-500" />
                预算 <b className="mx-0.5 text-brand-600">{params.budget.replace(/元以内/g, "")}</b> 元以内
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-success-100 bg-success-50 px-3.5 py-1.5 text-xs text-success-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              置信度 {confidence ? `${confidence}%` : "高"}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {PARAM_FIELDS.map((f) => (
              <ParamCard
                key={f.key}
                name={f.label}
                value={String(params[f.key])}
                editable
                onChange={(v) => updateParam(f.key, v)}
              />
            ))}
            <ParamCard
              name="通信方式"
              value={(params.communication || []).join(" / ")}
              editable
              onChange={(v) => updateParam("communication", v.split(/[，,、/\s]+/).filter(Boolean))}
            />
            <ParamCard
              name="接口类型"
              value={(params.interface || []).join(" / ")}
              editable
              onChange={(v) => updateParam("interface", v.split(/[，,、/\s]+/).filter(Boolean))}
            />
          </div>

          <div className="mb-6 rounded-2xl border border-brand-100/80 bg-brand-50/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-brand-600" />
              <span className="text-sm font-semibold text-brand-900">AI 分析：需要以下 {counts.size || 4} 类元器件</span>
            </div>
            <div className="space-y-2 text-sm text-brand-800">
              {(params.communication.includes("蓝牙") || params.communication.includes("BLE") ? [
                ["MCU", "低功耗蓝牙主控芯片，需支持 BLE 协议栈"],
                ["传感器", "与场景匹配的采集传感器"],
                ["电源", "电池供电管理 + LDO 稳压"],
                ["通信", "BLE 蓝牙模块（如 MCU 已集成则不需要单独模块）"],
              ] : [
                ["MCU", "主控芯片"],
                ["传感器", "与场景匹配的采集传感器"],
                ["电源", "供电管理与稳压"],
                ["通信", "按需选配（如 MCU 已集成则不需要单独模块）"],
              ]).map(([name, desc], i) => (
                <div key={name} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-200 text-xs font-bold text-brand-800">
                    {i + 1}
                  </span>
                  <span>
                    <b>{name}</b>：{desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {stage === "params" && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="btn-secondary text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                修改需求
              </button>
              <button
                type="button"
                onClick={handleRecommend}
                disabled={loading}
                className="btn-primary"
              >
                <span>确认参数，开始推荐</span>
                <span className="arr">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="mx-auto mt-6 max-w-4xl">
            <SkeletonCards count={3} />
          </div>
        )}

        {stage === "recs" && !loading && (
          <div className="mx-auto max-w-4xl">
            <div className="mt-8 mb-1 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50">
                <Layers className="h-5 w-5 text-brand-600" />
              </div>
              <h1 className="text-2xl font-bold text-ink-900">元器件推荐结果</h1>
            </div>
            <p className="mb-6 ml-10 text-sm text-ink-500">
              AI 从知识库中为你精选了以下元器件，点击「加入 BOM」选择需要的
            </p>

            {recommendations.length === 0 ? (
              <div className="rounded-xl border border-warning-100 bg-warning-50 px-5 py-6 text-center">
                <div className="mb-1 text-sm font-medium text-warning-700">没有找到匹配的元器件</div>
                <div className="text-xs text-warning-700">
                  建议简化需求描述，或去掉一些过严的参数（如特定接口、电压）后再试
                </div>
              </div>
            ) : (
              <>
                <div className="scrollbar-thin mb-6 flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={`filter-btn whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${filter === "all" ? "active" : ""}`}
                  >
                    全部 {recommendations.length}
                  </button>
                  {[...counts.entries()].map(([cat, n]) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilter(cat)}
                      className={`filter-btn whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${filter === cat ? "active" : ""}`}
                    >
                      {CATEGORY_LABELS[cat] || cat} {n}
                    </button>
                  ))}
                  <div className="mx-1 h-4 w-px bg-ink-200" />
                  <button
                    type="button"
                    onClick={() => setSortAsc((v) => !v)}
                    className="btn-secondary !py-1.5 text-xs"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {sortAsc ? "匹配度 低→高" : "匹配度 高→低"}
                  </button>
                </div>

                {[...grouped.entries()].map(([cat, recs]) => {
                  const SectionIcon = CATEGORY_ICONS[cat] || Cpu;
                  return (
                    <div key={cat} className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <SectionIcon className="h-4 w-4 text-brand-500" />
                        <h2 className="text-sm font-semibold text-ink-700">{CATEGORY_LABELS[cat] || cat}</h2>
                        <span className="text-xs text-ink-400">推荐 {recs.length} 个</span>
                      </div>
                      <div className="space-y-3">
                        {recs.map((rec) => (
                          <RecommendCard
                            key={rec.id}
                            component={rec}
                            selected={selected.has(rec.id)}
                            onToggle={toggleSelect}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStage("params")}
                    className="btn-secondary text-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    修改参数
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="btn-secondary text-sm"
                    >
                      <ListPlus className="h-4 w-4" />
                      {selected.size === recommendations.length && recommendations.length > 0
                        ? "取消全选"
                        : "全部加入 BOM"}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateBom}
                      disabled={loading}
                      className="btn-primary"
                    >
                      <span>生成 BOM 表</span>
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 font-mono text-xs">
                        {selected.size}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {stage === "params" && !loading && (
          <div className="mx-auto mt-4 max-w-3xl text-right">
            <button
              type="button"
              onClick={handleRecommend}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              已经推荐过？重新推荐 →
            </button>
          </div>
        )}
      </div>
      <ToastHost />
      <BackToTop />
    </main>
  );
}
