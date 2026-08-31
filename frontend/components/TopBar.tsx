"use client";

import {
  Check,
  Database,
  FileSpreadsheet,
  History,
  Layers,
  ListChecks,
  Menu,
  PenLine,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const STEP_ICONS = [PenLine, ListChecks, Layers, FileSpreadsheet];
const STEP_LABELS = ["输入需求", "参数确认", "元件推荐", "BOM导出"];

export default function TopBar({
  current,
  onStart,
}: {
  current: number;
  onStart?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="volt-nav">
        <nav className="volt-nav-pill" aria-label="主导航">
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_6px_16px_rgba(47,107,255,.35),inset_0_1px_1px_rgba(255,255,255,.35)]">
              <Zap className="h-4 w-4 fill-current" strokeWidth={2} />
            </span>
            <span className="text-[17px] font-bold tracking-tight text-ink-900">
              硬件选型助手
              <span className="ml-1.5 hidden text-xs font-normal text-ink-400 sm:inline">AI 驱动</span>
            </span>
          </Link>

          {/* 流程页：步骤进度；工具页：导航链接 */}
          {current > 0 ? (
            <div className="hidden items-center gap-1 md:flex">
              {STEP_ICONS.map((Icon, i) => {
                const n = i + 1;
                const state = n === current ? "active" : n < current ? "done" : "todo";
                return (
                  <div key={n} className="flex items-center">
                    {i > 0 && (
                      <div
                        className={`mx-1 h-0.5 w-5 rounded-full sm:w-7 ${
                          n <= current ? "bg-success-400" : "bg-ink-200"
                        }`}
                      />
                    )}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-medium transition-all ${
                          state === "active"
                            ? "bg-brand-600 text-white shadow-[0_6px_14px_rgba(47,107,255,.35)]"
                            : state === "done"
                              ? "bg-success-500 text-white"
                              : "bg-ink-100 text-ink-400"
                        }`}
                      >
                        {state === "done" ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      </span>
                      <span
                        className={`hidden text-xs font-medium lg:inline ${
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
          ) : (
            <div className="hidden items-center gap-7 text-sm text-ink-500 md:flex">
              <Link href="/history" className="transition-colors hover:text-brand-600">
                历史方案
              </Link>
              <Link href="/profile" className="transition-colors hover:text-brand-600">
                个人配置
              </Link>
              <Link href="/admin" className="transition-colors hover:text-brand-600">
                管理后台
              </Link>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Link
              href="/history"
              title="历史方案"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600"
            >
              <History className="h-4 w-4" />
            </Link>
            <Link
              href="/admin"
              title="管理后台"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600"
            >
              <Database className="h-4 w-4" />
            </Link>
            <Link
              href="/profile"
              title="个人主页"
              className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-medium text-white transition-opacity hover:opacity-80"
            >
              KJ
            </Link>

            <div className="mx-1 h-5 w-px bg-ink-200" />

            {onStart ? (
              <button
                type="button"
                onClick={onStart}
                className="btn-primary hidden sm:inline-flex"
              >
                <span>开始选型</span>
                <span className="arr">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </span>
              </button>
            ) : (
              <Link
                href="/#engine"
                onClick={() => setOpen(false)}
                className="btn-primary hidden sm:inline-flex"
              >
                <span>开始选型</span>
                <span className="arr">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </span>
              </Link>
            )}

            <button
              type="button"
              aria-label="菜单"
              onClick={() => setOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 md:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>
      </div>

      <div className={`volt-menu ${open ? "open" : ""}`}>
        {onStart ? (
          <button
            type="button"
            onClick={() => {
              onStart();
              setOpen(false);
            }}
            className="cursor-pointer"
          >
            开始选型
          </button>
        ) : (
          <Link href="/" onClick={() => setOpen(false)}>
            开始选型
          </Link>
        )}
        <Link href="/history" onClick={() => setOpen(false)}>
          历史方案
        </Link>
        <Link href="/profile" onClick={() => setOpen(false)}>
          个人配置
        </Link>
        <Link href="/admin" onClick={() => setOpen(false)}>
          管理后台
        </Link>
      </div>
    </>
  );
}
