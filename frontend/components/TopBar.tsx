import Link from "next/link";

const STEPS = ["输入需求", "参数解析", "元件推荐", "BOM导出"];

export default function TopBar({ current }: { current: number }) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-line bg-white px-4 py-3 sm:px-8">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-primary sm:text-base">
        <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] text-white sm:text-xs">HW</span>
        AI硬件选型助手
      </Link>
      <nav className="flex gap-1 overflow-x-auto text-[10px] sm:text-xs">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state =
            n === current
              ? "active"
              : n < current
                ? "done"
                : "todo";
          return (
            <span
              key={n}
              className={`whitespace-nowrap rounded-[20px] px-2 py-1.5 transition-all sm:px-3.5 ${
                state === "active"
                  ? "bg-primary text-white"
                  : state === "done"
                    ? "bg-success-bg text-success"
                    : "bg-[#f1efe8] text-muted"
              }`}
            >
              <span className="hidden sm:inline">{n} {label}</span>
              <span className="sm:hidden">{n}</span>
            </span>
          );
        })}
      </nav>
    </header>
  );
}
