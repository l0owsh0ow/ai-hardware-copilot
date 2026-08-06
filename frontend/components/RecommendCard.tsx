"use client";

import type { Component } from "@/lib/types";

function badgeFor(score: number) {
  if (score >= 0.9) return { label: `最佳匹配 ${Math.round(score * 100)}%`, cls: "bg-success-bg text-success" };
  if (score >= 0.8) return { label: `推荐 ${Math.round(score * 100)}%`, cls: "bg-info-bg text-info" };
  return { label: `可选 ${Math.round(score * 100)}%`, cls: "bg-warn-bg text-warn" };
}

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
  const params = component.key_params;

  const tagItems: [string, string][] = [];
  const order = ["core", "max_frequency", "flash", "standby_current", "bluetooth", "wireless", "interfaces", "working_voltage", "temperature_accuracy", "humidity_accuracy", "current", "range", "output", "max_current", "charge_current"];
  for (const key of order) {
    const v = params[key];
    if (v === undefined || v === null) continue;
    tagItems.push([key, String(Array.isArray(v) ? v.join("/") : v)]);
  }

  return (
    <div className="card mb-4 p-5 transition-colors hover:border-primary-hover">
      <div className="mb-3 flex items-start justify-between">
        <div className="text-[15px] font-semibold">
          {component.part_number}
          {component.manufacturer && (
            <span className="ml-1.5 text-xs font-normal text-muted">
              {component.manufacturer} · {component.subcategory || component.category}
            </span>
          )}
        </div>
        <span className={`rounded-[20px] px-2.5 py-1 text-[11px] font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {tagItems.slice(0, 6).map(([k, v]) => (
          <span key={k} className="param-tag">
            {k} <b>{v}</b>
          </span>
        ))}
      </div>

      {component.recommend_reason && (
        <div className="rounded-lg border-l-[3px] border-primary bg-[#f9f8f5] px-3.5 py-2.5 text-[13px] leading-relaxed text-soft">
          {component.recommend_reason}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="text-base font-semibold text-price">
          ¥{component.price_cny.toFixed(2)}
          <span className="ml-1 text-xs font-normal text-muted">
            /{component.price_unit} · {component.stock_status}
          </span>
        </div>
        <div className="flex gap-2">
          {component.datasheet_url && (
            <a
              className="btn-link"
              href={component.datasheet_url}
              target="_blank"
              rel="noreferrer"
            >
              Datasheet
            </a>
          )}
          <button
            type="button"
            className={`btn-select ${selected ? "selected" : ""}`}
            onClick={() => onToggle(component)}
          >
            {selected ? "已选" : "加入BOM"}
          </button>
        </div>
      </div>
    </div>
  );
}
