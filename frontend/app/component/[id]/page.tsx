"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import TopBar from "@/components/TopBar";
import { fetchComponent } from "@/lib/api";
import type { ComponentDetail } from "@/lib/types";

export default function ComponentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [comp, setComp] = useState<ComponentDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    fetchComponent(params.id)
      .then(setComp)
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [params]);

  if (error) {
    return (
      <main>
        <TopBar current={3} />
        <div className="mx-auto max-w-[860px] px-6 py-8 text-center text-sm text-warn">{error}</div>
      </main>
    );
  }

  if (!comp) {
    return (
      <main>
        <TopBar current={3} />
        <div className="mx-auto max-w-[860px] px-6 py-8 text-center text-sm text-muted">加载中...</div>
      </main>
    );
  }

  return (
    <main>
      <TopBar current={3} />
      <div className="mx-auto max-w-[860px] px-6 py-8">
        <button type="button" className="mb-4 text-xs text-primary" onClick={() => router.back()}>
          ← 返回
        </button>
        <div className="card p-6">
          <h1 className="mb-1 text-2xl font-semibold">{comp.part_number}</h1>
          <p className="mb-4 text-sm text-muted">
            {comp.manufacturer} · {comp.category} / {comp.subcategory} · {comp.package}
          </p>
          <p className="mb-5 rounded-lg bg-surface px-4 py-3 text-[13px] leading-relaxed text-soft">
            {comp.description}
          </p>

          <div className="mb-5 grid grid-cols-2 gap-3">
            {Object.entries(comp.key_params).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line p-3">
                <div className="mb-1 text-[11px] text-muted">{k}</div>
                <div className="text-sm font-medium">
                  {Array.isArray(v) ? v.join(" / ") : String(v)}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-5 flex items-center justify-between">
            <div className="text-xl font-semibold text-price">
              ¥{comp.price_cny.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted">/{comp.price_unit} · {comp.stock_status}</span>
            </div>
            <div className="flex gap-2">
              {comp.datasheet_url && (
                <a className="btn-link" href={comp.datasheet_url} target="_blank" rel="noreferrer">
                  Datasheet
                </a>
              )}
              {comp.supplier_url && (
                <a className="btn-select" href={comp.supplier_url} target="_blank" rel="noreferrer">
                  去采购
                </a>
              )}
            </div>
          </div>

          {comp.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {comp.tags.map((t) => (
                <span key={t} className="param-tag">#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
