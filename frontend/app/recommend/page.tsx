"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ParamCard from "@/components/ParamCard";
import RecommendCard from "@/components/RecommendCard";
import SkeletonCards from "@/components/SkeletonCards";
import TopBar from "@/components/TopBar";
import { fetchRecommendations, generateBom } from "@/lib/api";
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

export default function RecommendPage() {
  const router = useRouter();
  const [params, setParams] = useState<StructuredParams | null>(null);
  const [recommendations, setRecommendations] = useState<Component[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = store.getParams();
    if (!p) {
      router.replace("/");
      return;
    }
    setParams(p);
    setRecommendations(store.getRecommendations() || []);
    setSelected(new Set(store.getSelected()));
    setSearched((store.getRecommendations() || []).length > 0);
  }, [router]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Component[]>();
    for (const rec of recommendations) {
      if (!groups.has(rec.category)) groups.set(rec.category, []);
      groups.get(rec.category)!.push(rec);
    }
    return groups;
  }, [recommendations]);

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
    try {
      const recs = await fetchRecommendations(params);
      setRecommendations(recs);
      store.setRecommendations(recs);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "推荐失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(c: Component) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.add(c.id);
      store.setSelected([...next]);
      return next;
    });
  }

  async function handleGenerateBom() {
    const items = recommendations.filter((r) => selected.has(r.id));
    if (items.length === 0) {
      setError("请先选择至少一个元器件加入 BOM");
      return;
    }
    setLoading(true);
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

  if (!params) {
    return (
      <main>
        <TopBar current={2} />
        <div className="mx-auto max-w-[860px] px-6 py-8 text-center text-sm text-muted">加载中...</div>
      </main>
    );
  }

  const currentStep = recommendations.length > 0 ? 3 : 2;

  return (
    <main>
      <TopBar current={currentStep} />
      <div className="mx-auto max-w-[860px] px-6 py-8">
        {error && (
          <div className="mb-4 rounded-xl bg-warn-bg px-4 py-3 text-[13px] text-warn">{error}</div>
        )}

        <h1 className="mb-2 text-2xl font-semibold">AI解析的需求参数</h1>
        <p className="mb-6 text-sm text-muted">请确认以下参数是否准确，可点击数值修改</p>

        <div className="mb-6 flex gap-3">
          <div className="card px-4 py-2 text-xs text-soft">
            识别到 <b className="text-primary">{(params.communication.length || 1) + 2}</b> 个元器件需求
          </div>
          <div className="card px-4 py-2 text-xs text-soft">
            预计 <b className="text-primary">3</b> 分钟完成选型
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        {loading && <SkeletonCards count={4} />}

        {searched && !loading && recommendations.length === 0 && (
          <div className="mb-6 rounded-xl bg-warn-bg px-5 py-6 text-center">
            <div className="mb-1 text-sm font-medium text-warn">没有找到匹配的元器件</div>
            <div className="text-xs text-warn">
              建议简化需求描述，或去掉一些过严的参数（如特定接口、电压）后再试
            </div>
          </div>
        )}

        {!searched && !loading && (
          <div className="mb-6 rounded-xl bg-info-bg px-5 py-4">
            <div className="mb-1 text-[13px] font-medium text-info">
              AI分析：需要以下元器件
            </div>
            <div className="text-xs leading-relaxed text-info">
              {params.communication.includes("蓝牙") || params.communication.includes("BLE") ? (
                <>1. <b>MCU</b> — 低功耗蓝牙主控（可能集成BLE）</>
              ) : (
                <>1. <b>MCU</b> — 主控芯片</>
              )}
              <br />2. <b>传感器</b> — 与场景匹配的采集传感器
              <br />3. <b>电源</b> — 供电管理与稳压
              <br />4. <b>通信</b> — 按需选配（如MCU已集成则不需要单独模块）
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.push("/")}>
            ← 修改需求
          </button>
        {!searched ? (
            <button type="button" className="btn-primary" disabled={loading} onClick={handleRecommend}>
              {loading ? "AI推荐中..." : "确认，开始推荐 →"}
            </button>
          ) : (
            <button type="button" className="btn-primary" disabled={loading} onClick={handleGenerateBom}>
              生成BOM表 →
            </button>
          )}
        </div>

        {recommendations.length > 0 && (
          <div className="mt-8">
            <h1 className="mb-1 text-2xl font-semibold">元器件推荐结果</h1>
            <p className="mb-2 text-sm text-muted">
              AI从知识库中为你精选了以下元器件，点击“加入BOM”选择你需要的
            </p>
            {[...grouped.entries()].map(([cat, recs]) => (
              <div key={cat}>
                <div className="mb-3 mt-6 flex items-center gap-2">
                  <h2 className="text-base font-semibold">{CATEGORY_LABELS[cat] || cat}</h2>
                  <span className="text-xs text-muted">推荐 {recs.length} 个</span>
                </div>
                {recs.map((rec) => (
                  <RecommendCard
                    key={rec.id}
                    component={rec}
                    selected={selected.has(rec.id)}
                    onToggle={toggleSelect}
                  />
                ))}
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted">
                已选 <b className="text-primary">{selected.size}</b> 个元器件
              </span>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={() => router.push("/")}>
                  ← 重新输入
                </button>
                <button type="button" className="btn-secondary" disabled={loading} onClick={handleRecommend}>
                  {loading ? "推荐中..." : "重新推荐"}
                </button>
                <button type="button" className="btn-primary" disabled={loading} onClick={handleGenerateBom}>
                  生成BOM表 →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
