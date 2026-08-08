"use client";

import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  FileText,
  Info,
  Package,
  Plus,
  Sparkles,
  Store,
} from "lucide-react";

import type { Component } from "@/lib/types";

function badgeFor(score: number) {
  if (score >= 0.9)
    return {
      label: `最佳匹配 ${Math.round(score * 100)}%`,
      cls: "bg-success-50 text-success-700",
      Icon: Award,
      reason: "brand",
    };
  if (score >= 0.8)
    return {
      label: `推荐 ${Math.round(score * 100)}%`,
      cls: "bg-blue-50 text-blue-700",
      Icon: Info,
      reason: "ink",
    };
  return {
    label: `可选 ${Math.round(score * 100)}%`,
    cls: "bg-amber-50 text-amber-700",
    Icon: AlertTriangle,
    reason: "amber",
  };
}

const REASON_STYLES: Record<string, { box: string; Icon: React.ComponentType<{ className?: string }>; iconCls: string }> = {
  brand: { box: "border-l-2 border-brand-400 bg-brand-50/50", Icon: Sparkles, iconCls: "text-brand-500" },
  ink: { box: "border-l-2 border-ink-300 bg-ink-50/50", Icon: Info, iconCls: "text-ink-400" },
  amber: { box: "border-l-2 border-amber-300 bg-amber-50/30", Icon: AlertTriangle, iconCls: "text-amber-500" },
};

const PARAM_ORDER = [
  "core", "max_frequency", "flash", "standby_current", "bluetooth", "wireless", "interfaces",
  "working_voltage", "temperature_accuracy", "humidity_accuracy", "current", "range",
  "output", "max_current", "charge_current", "quiescent_current", "input_voltage", "dropout",
];

export default function RecommendCard({
  component,
  selected,
  onToggle,
}: {
  component: Component;
  selected: boolean;
  onToggle: (c: Component) => void;
}) {
  const badge = badgeFor(component.match_score);
  const reason = REASON_STYLES[badge.reason];
  const params = component.key_params;

  const tags: [string, string][] = [];
  for (const key of PARAM_ORDER) {
    const v = params[key];
    if (v === undefined || v === null) continue;
    tags.push([key, String(Array.isArray(v) ? v.join("/") : v)]);
  }

  return (
    <div className="card-hover overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-ink-900">{component.part_number}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                <badge.Icon className="h-3 w-3" />
                {badge.label}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400">
              {component.manufacturer && <span>{component.manufacturer}</span>}
              <span>·</span>
              <span>{component.subcategory || component.category}</span>
              <span className="text-ink-300">|</span>
              <span className="flex items-center gap-0.5">
                <Package className="h-3 w-3" />
                {component.stock_status || "现货"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-ink-900">¥{component.price_cny.toFixed(2)}</div>
            <div className="text-xs text-ink-400">/ {component.price_unit}</div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.slice(0, 6).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1 rounded bg-ink-50 px-2 py-0.5 text-xs text-ink-600">
              {k} <b className="font-medium text-ink-800">{v}</b>
            </span>
          ))}
        </div>

        {component.recommend_reason && (
          <div className={`flex gap-2 rounded-lg p-3 ${reason.box}`}>
            <reason.Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${reason.iconCls}`} />
            <p className="text-xs leading-relaxed text-ink-600">{component.recommend_reason}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50/50 px-5 py-3">
        <div className="flex items-center gap-3 text-xs text-ink-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            价格更新于 2026.08
          </span>
          <span className="flex items-center gap-1">
            <Store className="h-3 w-3" />
            立创商城
          </span>
        </div>
        <div className="flex items-center gap-2">
          {component.datasheet_url && (
            <a
              href={component.datasheet_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50"
            >
              <FileText className="h-3 w-3" />
              Datasheet
            </a>
          )}
          <button
            type="button"
            onClick={() => onToggle(component)}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
              selected ? "bg-success-600 hover:bg-success-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {selected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {selected ? "已选" : "加入 BOM"}
          </button>
        </div>
      </div>
    </div>
  );
}
