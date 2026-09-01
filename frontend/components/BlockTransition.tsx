"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

/**
 * 路由切换：抓取当前页面画面作为「破碎对象」，切换后把旧画面像素化、不规则消失，
 * 露出新页面。只在点击站内链接时抓图，pointer-events:none 不阻塞交互。
 */
export default function BlockTransition() {
  const path = usePathname();
  const prev = useRef(path);
  const snapRef = useRef<{ url: string; t: number } | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);

  useEffect(() => {
    let captured = false;
    async function capture() {
      if (captured) return;
      captured = true;
      try {
        const canvas = await html2canvas(document.body, {
          backgroundColor: "#f4f7fb",
          scale: 0.28,
          useCORS: true,
          logging: false,
        });
        snapRef.current = { url: canvas.toDataURL("image/png"), t: Date.now() };
      } catch {
        /* 抓取失败则无过渡 */
      }
    }
    function onPointerDown(e: PointerEvent) {
      const a = (e.target as HTMLElement).closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/#")) return;
      void capture();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (prev.current === path) return;
    prev.current = path;
    const t = window.setTimeout(() => {
      const s = snapRef.current;
      if (s && Date.now() - s.t < 1400) {
        setOverlay(s.url);
        window.setTimeout(() => setOverlay(null), 1250);
      }
    }, 90);
    return () => window.clearTimeout(t);
  }, [path]);

  if (!overlay) return null;
  return (
    <div className="ptr-break" aria-hidden="true">
      <img src={overlay} className="ptr-break-img" alt="" draggable={false} />
    </div>
  );
}
