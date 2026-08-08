"use client";

import { ArrowLeft, FileText, Package, ShoppingCart } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-danger-600">{error}</div>
      </main>
    );
  }

  if (!comp) {
    return (
      <main>
        <TopBar current={3} />
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-ink-500">加载中...</div>
      </main>
    );
  }

  return (
    <main>
      <TopBar current={3} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回
          </button>

          <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
            <div className="p-6">
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-2xl font-bold text-ink-900">{comp.part_number}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {comp.category} / {comp.subcategory}
                </span>
              </div>
              <div className="mb-5 flex items-center gap-1.5 text-xs text-ink-400">
                {comp.manufacturer && <span>{comp.manufacturer}</span>}
                <span>·</span>
                <span>{comp.package}</span>
                <span className="text-ink-300">|</span>
                <span className="flex items-center gap-0.5">
                  <Package className="h-3 w-3" />
                  {comp.stock_status}
                </span>
              </div>

              <p className="mb-5 rounded-lg bg-ink-50/50 p-4 text-sm leading-relaxed text-ink-600">
                {comp.description}
              </p>

              <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                {Object.entries(comp.key_params).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-ink-200 p-3">
                    <div className="mb-1 text-xs text-ink-400">{k}</div>
                    <div className="text-sm font-semibold text-ink-800">
                      {Array.isArray(v) ? v.join(" / ") : String(v)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-ink-900">¥{comp.price_cny.toFixed(2)}</div>
                  <div className="text-xs text-ink-400">/ {comp.price_unit}</div>
                </div>
                <div className="flex gap-2">
                  {comp.datasheet_url && (
                    <a
                      href={comp.datasheet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
                    >
                      <FileText className="h-4 w-4" />
                      Datasheet
                    </a>
                  )}
                  {comp.supplier_url && (
                    <a
                      href={comp.supplier_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary inline-flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-700"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      去采购
                    </a>
                  )}
                </div>
              </div>

              {comp.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {comp.tags.map((t) => (
                    <span key={t} className="rounded bg-ink-50 px-2 py-0.5 text-xs text-ink-600">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
