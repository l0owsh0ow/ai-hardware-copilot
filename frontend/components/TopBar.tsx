"use client";

import { Check, Cpu, Database, FileSpreadsheet, HelpCircle, History, Layers, ListChecks, PenLine } from "lucide-react";
import Link from "next/link";

const STEP_ICONS = [PenLine, ListChecks, Layers, FileSpreadsheet];
const STEP_LABELS = ["输入需求", "参数确认", "元件推荐", "BOM导出"];

export default function TopBar({ current }: { current: number }) {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-ink-900">硬件选型助手</span>
          <span className="hidden text-xs text-ink-400 sm:inline">Beta</span>
        </Link>

        <div className="flex items-center gap-1">
          {STEP_ICONS.map((Icon, i) => {
            const n = i + 1;
            const state = n === current ? "active" : n < current ? "done" : "todo";
            return (
              <div key={n} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`mx-1 h-0.5 w-5 rounded-full sm:w-6 ${
                      n <= current ? "bg-success-400" : "bg-ink-200"
                    }`}
                  />
                )}
                <div className="flex items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all ${
                      state === "active"
                        ? "bg-brand-600 text-white"
                        : state === "done"
                          ? "bg-success-500 text-white"
                          : "bg-ink-200 text-ink-400"
                    }`}
                  >
                    {state === "done" ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span
                    className={`ml-1.5 hidden text-xs font-medium md:inline ${
                      state === "active" ? "text-brand-700" : "text-ink-400"
                    }`}
                  >
                    {STEP_LABELS[i]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/admin"
            className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100"
            title="管理后台"
          >
            <Database className="h-4 w-4" />
          </Link>
          <Link
            href="/history"
            className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100"
            title="历史方案"
          >
            <History className="h-4 w-4" />
          </Link>
          <button type="button" className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100" title="帮助">
            <HelpCircle className="h-4 w-4" />
          </button>
          <div className="mx-0.5 h-5 w-px bg-ink-200" />
          <Link
            href="/profile"
            title="个人主页"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-medium text-white transition-opacity hover:opacity-80"
          >
            KJ
          </Link>
        </div>
      </div>
    </header>
  );
}
