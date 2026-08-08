"use client";

import type { BOMItem } from "@/lib/types";

const CATEGORY_STYLES: Record<string, string> = {
  mcu: "bg-brand-50 text-brand-700",
  sensor: "bg-success-50 text-success-700",
  power: "bg-warning-50 text-warning-700",
  comm: "bg-blue-50 text-blue-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  mcu: "MCU",
  sensor: "传感器",
  power: "电源",
  comm: "通信",
};

export default function BOMTable({
  items,
  quantities,
  onQtyChange,
}: {
  items: BOMItem[];
  quantities: Record<string, number>;
  onQtyChange: (partNumber: string, qty: number) => void;
}) {
  return (
    <div className="scrollbar-thin mb-4 max-h-[480px] overflow-y-auto rounded-2xl border border-ink-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-ink-200 bg-ink-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-ink-500">#</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ink-500">型号</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ink-500">分类</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ink-500">描述</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-ink-500">数量</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-ink-500">单价</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-ink-500">小计</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {items.map((item, i) => {
            const qty = quantities[item.part_number] ?? item.quantity;
            return (
              <tr key={item.part_number} className="transition-colors hover:bg-ink-50/50">
                <td className="px-4 py-3 text-sm text-ink-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-ink-800">{item.part_number}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                      CATEGORY_STYLES[item.category] || "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {CATEGORY_LABELS[item.category] || item.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-ink-500">{item.description}</td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) =>
                      onQtyChange(item.part_number, Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-14 rounded-lg border border-ink-200 px-2 py-1 text-center text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </td>
                <td className="px-4 py-3 text-right text-sm text-ink-600">¥{item.unit_price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-ink-800">
                  ¥{(item.unit_price * qty).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
