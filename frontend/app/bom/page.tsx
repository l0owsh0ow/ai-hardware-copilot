"use client";

import {
  ArrowLeft,
  Battery,
  Bluetooth,
  Bookmark,
  Brain,
  Cpu,
  Download,
  FileSpreadsheet,
  Gauge,
  Info,
  Lightbulb,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BackToTop from "@/components/BackToTop";
import BOMTable from "@/components/BOMTable";
import ToastHost from "@/components/ToastHost";
import TopBar from "@/components/TopBar";
import { exportBomUrl } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { store } from "@/lib/store";
import type { BOMTable as BOM } from "@/lib/types";

export default function BomPage() {
  const router = useRouter();
  const [bom, setBom] = useState<BOM | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const b = store.getBom();
    if (!b) {
      router.replace("/");
      return;
    }
    setBom(b);
    setQuantities(Object.fromEntries(b.items.map((it) => [it.part_number, it.quantity])));
  }, [router]);

  const total = useMemo(() => {
    if (!bom) return 0;
    return bom.items.reduce(
      (sum, it) => sum + it.unit_price * (quantities[it.part_number] ?? it.quantity),
      0
    );
  }, [bom, quantities]);

  function handleExport(format: "excel" | "csv") {
    if (!bom) return;
    window.open(exportBomUrl(bom.id, format, quantities), "_blank");
    showToast(`已导出为 ${format.toUpperCase()} 文件`, "success");
  }

  if (!bom) {
    return (
      <main>
        <TopBar current={4} />
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-ink-500">加载中...</div>
      </main>
    );
  }

  return (
    <main>
      <TopBar current={4} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <FileSpreadsheet className="h-5 w-5 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-ink-900">BOM 物料清单</h1>
          </div>
          <p className="mb-6 ml-10 text-sm text-ink-500">已自动生成物料清单，可调整数量后导出</p>

          <BOMTable
            items={bom.items}
            quantities={quantities}
            onQtyChange={(part, qty) => setQuantities((prev) => ({ ...prev, [part]: qty }))}
          />

          <div className="mb-4 flex items-center justify-between rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-brand-100/50 p-5">
            <div>
              <div className="text-sm font-medium text-brand-700">BOM 总成本</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                <Info className="h-3 w-3" />
                价格仅供参考，以实际采购为准
              </div>
            </div>
            <div className="text-3xl font-bold text-ink-900">¥{total.toFixed(2)}</div>
          </div>

          <div className="mb-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-50">
                <Brain className="h-4 w-4 text-success-600" />
              </div>
              <span className="text-sm font-semibold text-ink-800">AI 方案概要</span>
            </div>
            <div className="space-y-2.5 text-sm text-ink-600">
              <div className="flex items-start gap-2">
                <Cpu className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ink-400" />
                <span>
                  <b className="text-ink-800">项目：</b>
                  {bom.project_name}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Battery className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ink-400" />
                <span>
                  <b className="text-ink-800">生成时间：</b>
                  {bom.created_at}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Bluetooth className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ink-400" />
                <span>
                  <b className="text-ink-800">元器件数：</b>
                  {bom.items.length} 项
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Gauge className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ink-400" />
                <span>
                  <b className="text-ink-800">价格说明：</b>
                  数据来自知识库快照，波动较大，采购前请以商城实时价格为准
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-warning-500" />
                <span>
                  <b className="text-ink-800">设计提示：</b>
                  建议按 MCU → 传感器 → 电源 顺序核对选型，注意接口电平匹配
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => router.push("/recommend")}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100"
            >
              <ArrowLeft className="h-4 w-4" />
              重新选型
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => showToast("方案已保存（MVP 暂未开通账号系统）", "success")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50"
              >
                <Bookmark className="h-4 w-4" />
                保存方案
              </button>
              <button
                type="button"
                onClick={() => handleExport("excel")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                导出 Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport("csv")}
                className="btn-primary inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-700"
              >
                <Download className="h-4 w-4" />
                导出 CSV
              </button>
            </div>
          </div>
        </div>
      </div>
      <ToastHost />
      <BackToTop />
    </main>
  );
}
