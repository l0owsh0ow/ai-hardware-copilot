"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BOMTable from "@/components/BOMTable";
import TopBar from "@/components/TopBar";
import { exportBomUrl } from "@/lib/api";
import { store } from "@/lib/store";
import type { BOMTable as BOM } from "@/lib/types";

export default function BomPage() {
  const router = useRouter();
  const [bom, setBom] = useState<BOM | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    const b = store.getBom();
    if (!b) {
      router.replace("/");
      return;
    }
    setBom(b);
    setQuantities(
      Object.fromEntries(b.items.map((it) => [it.part_number, it.quantity]))
    );
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
    setToast(`BOM已导出为 ${format.toUpperCase()} 文件`);
    setTimeout(() => setToast(""), 2500);
  }

  if (!bom) {
    return (
      <main>
        <TopBar current={4} />
        <div className="mx-auto max-w-[860px] px-6 py-8 text-center text-sm text-muted">加载中...</div>
      </main>
    );
  }

  return (
    <main>
      <TopBar current={4} />
      <div className="mx-auto max-w-[860px] px-6 py-8">
        <h1 className="mb-2 text-2xl font-semibold">BOM 物料清单</h1>
        <p className="mb-6 text-sm text-muted">已自动生成物料清单，可调整数量后导出</p>

        <BOMTable
          items={bom.items}
          quantities={quantities}
          onQtyChange={(part, qty) => setQuantities((prev) => ({ ...prev, [part]: qty }))}
        />

        <div className="mt-5 flex items-center justify-between rounded-xl bg-primary-light px-5 py-4">
          <div>
            <div className="text-sm font-medium text-primary-dark">BOM总成本</div>
            <div className="mt-0.5 text-xs text-muted">价格仅供参考，以实际采购为准</div>
          </div>
          <div className="text-[22px] font-semibold text-price">¥{total.toFixed(2)}</div>
        </div>

        <div className="mt-5 rounded-xl bg-success-bg px-5 py-4">
          <div className="mb-2 text-[13px] font-medium text-success">AI方案概要</div>
          <div className="text-xs leading-relaxed text-success">
            <b>项目：</b>{bom.project_name}<br />
            <b>生成时间：</b>{bom.created_at}<br />
            <b>元器件数：</b>{bom.items.length} 项<br />
            <b>设计提示：</b>价格数据来自知识库快照，波动较大，采购前请以商城实时价格为准
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => router.push("/recommend")}>
            ← 重新选型
          </button>
          <button type="button" className="btn-primary" onClick={() => handleExport("excel")}>
            导出 Excel
          </button>
          <button type="button" className="btn-primary" onClick={() => handleExport("csv")}>
            导出 CSV
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-[10px] bg-ink px-6 py-2.5 text-[13px] text-white">
          {toast}
        </div>
      )}
    </main>
  );
}
