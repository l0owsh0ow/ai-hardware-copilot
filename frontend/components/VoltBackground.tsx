"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * VOLT 背景图行为：进入态照片清晰可见，滚过首屏（或进入工具页）后
 * 淡出到约 40% 可见度并降饱和。只动 opacity / transform / filter，
 * 不用 scroll 监听，用 IntersectionObserver。
 */
export default function VoltBackground() {
  const pathname = usePathname();
  const [engaged, setEngaged] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== "/") {
      // 工具页直接从「使用态」开始
      setEngaged(true);
      return;
    }
    setEngaged(false);
    // 首页由页面自身控制（点击「开始选型」后隐入背景）
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ engaged: boolean }>).detail;
      setEngaged(detail.engaged);
    };
    window.addEventListener("hc-bg-engage", handler);
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => !e.isIntersecting)) setEngaged(true);
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.removeEventListener("hc-bg-engage", handler);
    };
  }, [pathname]);

  return (
    <>
      <div className={`volt-bg ${engaged ? "engaged" : ""}`} aria-hidden="true" />
      <div className={`volt-wash ${engaged ? "engaged" : ""}`} aria-hidden="true" />
      <div ref={sentinelRef} className="pointer-events-none absolute inset-x-0 top-0 h-[100dvh]" aria-hidden="true" />
    </>
  );
}
