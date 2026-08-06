"use client";

import type { BOMItem } from "@/lib/types";

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
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface text-left text-xs font-medium text-muted">
            <th className="border-b border-line px-4 py-3">序号</th>
            <th className="border-b border-line px-4 py-3">型号</th>
            <th className="border-b border-line px-4 py-3">分类</th>
            <th className="border-b border-line px-4 py-3">描述</th>
            <th className="w-20 border-b border-line px-4 py-3 text-center">数量</th>
            <th className="w-24 border-b border-line px-4 py-3 text-right">单价</th>
            <th className="w-24 border-b border-line px-4 py-3 text-right">小计</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const qty = quantities[item.part_number] ?? item.quantity;
            return (
              <tr key={item.part_number} className="border-b border-line-soft last:border-none">
                <td className="px-4 py-3 text-[13px]">{i + 1}</td>
                <td className="px-4 py-3 text-[13px] font-semibold">{item.part_number}</td>
                <td className="px-4 py-3 text-[13px]">{item.category}</td>
                <td className="px-4 py-3 text-[13px] text-soft">{item.description}</td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) =>
                      onQtyChange(item.part_number, Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-12 rounded-md border border-inputline px-1 py-1 text-center text-[13px]"
                  />
                </td>
                <td className="px-4 py-3 text-right text-[13px]">¥{item.unit_price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-[13px]">
                  ¥{(item.unit_price * qty).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
