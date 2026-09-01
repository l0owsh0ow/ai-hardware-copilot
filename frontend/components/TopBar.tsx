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
import { useEffect, useState } from "react";

import { store } from "@/lib/store";

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
  // 是否已进入主流程（有本次选型的参数/结果）；进入后再离开到个人页可一键回到选型
  const [inFlow, setInFlow] = useState(false);

  useEffect(() => {
    setInFlow(Boolean(store.getParams() || store.getRecommendations()));
  }, []);

  return (
    <>
      <div className="volt-nav">
        <nav className="volt-nav-pill" aria-label="主导航">
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="voxel-block grid h-9 w-9 place-items-center bg-gradient-to-br from-brand-500 to-brand-700 text-white">
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
                        className={`grid h-7 w-7 place-items-center rounded-none text-xs font-medium transition-all ${
                          state === "active"
                            ? "bg-brand-600 text-white shadow-[3px_3px_0_rgba(10,27,77,.8)]"
                            : state === "done"
                              ? "bg-success-500 text-white"
                              : "border-2 border-ink-950 bg-ink-100 text-ink-400"
                        }`}
                      >
                        {state === "done" ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      </span>
                      <span
                        className={`hidden text-[11px] font-semibold sm:inline ${
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
              className="grid h-8 w-8 place-items-center rounded-none border-2 border-ink-950 bg-white text-ink-700 shadow-[3px_3px_0_rgba(10,27,77,.75)] transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px] hover:text-brand-600"
            >
              <History className="h-4 w-4" />
            </Link>
            <Link
              href="/admin"
              title="管理后台"
              className="grid h-8 w-8 place-items-center rounded-none border-2 border-ink-950 bg-white text-ink-700 shadow-[3px_3px_0_rgba(10,27,77,.75)] transition-transform hover:-translate-x-[1px] hover:-translate-y-[1px] hover:text-brand-600"
            >
              <Database className="h-4 w-4" />
            </Link>
            <Link
              href="/profile"
              title="个人主页"
              className="grid h-8 w-8 place-items-center rounded-none border-2 border-ink-950 bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-medium text-white shadow-[3px_3px_0_rgba(10,27,77,.75)]"
            >
              KJ
            </Link>

            <div className="mx-1 h-5 w-px bg-ink-200" />

            {inFlow ? (
              <Link
                href="/recommend"
                onClick={() => setOpen(false)}
                className="voxel-btn hidden !px-5 !py-2.5 text-sm sm:inline-flex"
              >
                <span>回到选型</span>
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
            ) : onStart ? (
              <button
                type="button"
                onClick={onStart}
                className="voxel-btn hidden !px-5 !py-2.5 text-sm sm:inline-flex"
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
                className="voxel-btn hidden !px-5 !py-2.5 text-sm sm:inline-flex"
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
              className="grid h-9 w-9 place-items-center rounded-none border-2 border-ink-950 bg-white text-ink-700 shadow-[3px_3px_0_rgba(10,27,77,.75)] md:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>
      </div>

      <div className={`volt-menu ${open ? "open" : ""}`}>
        {inFlow ? (
          <Link href="/recommend" onClick={() => setOpen(false)}>
            回到选型
          </Link>
        ) : onStart ? (
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
