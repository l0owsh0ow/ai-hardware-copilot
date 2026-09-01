"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

/**
 * 路由切换：抓取当前页面画面作为「破碎对象」，切换后把旧画面像素化、不规则消失，
 * 露出新页面。抓图在点击站内链接的瞬间开始（锁存旧页面），并在切换后等待抓图完成再播放。
 * pointer-events:none，不阻塞交互。
 */
export default function BlockTransition() {
  const path = usePathname();
  const prev = useRef(path);
  const pendingRef = useRef<Promise<string | null> | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);

  useEffect(() => {
    async function capture(): Promise<string | null> {
      if (pendingRef.current) return pendingRef.current;
      const p = (async () => {
        try {
          const canvas = await html2canvas(document.body, {
            backgroundColor: "#f4f7fb",
            scale: 0.3,
            useCORS: true,
            logging: false,
            ignoreElements: (el) => {
              if (el.classList?.contains("pixel-grain")) return true;
              if (el.classList?.contains("voxel-cube")) return true;
              return false;
            },
          });
          return canvas.toDataURL("image/png");
        } catch {
          return null;
        }
      })();
      pendingRef.current = p;
      return p;
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
      const p = pendingRef.current;
      if (!p) return;
      const timeout = new Promise<null>((res) => window.setTimeout(() => res(null), 900));
      Promise.race([p, timeout]).then((url) => {
        if (!url) return;
        setOverlay(url);
        window.setTimeout(() => setOverlay(null), 1250);
      });
    }, 60);
    return () => window.clearTimeout(t);
  }, [path]);

  if (!overlay) return null;
  return (
    <div className="ptr-break" aria-hidden="true">
      <img src={overlay} className="ptr-break-img" alt="" draggable={false} />
    </div>
  );
}
