"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#2f6bff", "#12b76a", "#8fb4ff", "#64d69b", "#ffffff"];

/**
 * 全局光标特效：像素小光块 + 柔光晕平滑跟随指针（用 ref + rAF，不碰 React 状态），
 * 点击时在指针处爆开一圈像素方块。尊重 prefers-reduced-motion，禁用时静止不闪。
 */
export default function CursorFX() {
  const glowRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    let tx = -200, ty = -200, gx = -200, gy = -200, sx = -200, sy = -200;
    let raf = 0;

    function spawnBurst(x: number, y: number) {
      const host = burstRef.current;
      if (!host) return;
      for (let i = 0; i < 10; i++) {
        const el = document.createElement("span");
        const size = 4 + Math.random() * 6;
        const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
        const dist = 12 + Math.random() * 24;
        const dx = Math.cos(ang) * dist;
        const dy = Math.sin(ang) * dist;
        el.className = "absolute block";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.background = COLORS[i % COLORS.length];
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.marginLeft = `${-size / 2}px`;
        el.style.marginTop = `${-size / 2}px`;
        el.style.boxShadow = "1px 1px 0 rgba(10,27,77,.6)";
        el.style.pointerEvents = "none";
        el.style.transition = "transform .55s cubic-bezier(.16,1,.3,1), opacity .5s ease-out";
        host.appendChild(el);
        requestAnimationFrame(() => {
          el.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 360}deg)`;
          el.style.opacity = "0";
        });
        window.setTimeout(() => el.remove(), 560);
      }
    }

    function onMove(e: PointerEvent) {
      tx = e.clientX;
      ty = e.clientY;
      if (glowRef.current) glowRef.current.style.opacity = "1";
      if (sparkRef.current) sparkRef.current.style.opacity = "1";
    }
    function onLeave() {
      if (glowRef.current) glowRef.current.style.opacity = "0";
      if (sparkRef.current) sparkRef.current.style.opacity = "0";
    }
    function onDown(e: PointerEvent) {
      spawnBurst(e.clientX, e.clientY);
    }

    function tick() {
      gx += (tx - gx) * 0.16;
      gy += (ty - gy) * 0.16;
      sx += (tx - sx) * 0.28;
      sy += (ty - sy) * 0.28;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
      }
      if (sparkRef.current) {
        sparkRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
      {/* 柔光晕，跟随指针 */}
      <div
        ref={glowRef}
        className="absolute left-0 top-0 h-44 w-44 opacity-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle, rgba(47,107,255,.26) 0%, rgba(18,183,106,.12) 42%, transparent 68%)",
        }}
      />
      {/* 像素小光块，缓动跟随指针 */}
      <div ref={sparkRef} className="absolute left-0 top-0 h-6 w-6 opacity-0 transition-opacity duration-300">
        <div className="cursor-rotate absolute inset-0">
          <span className="absolute left-0 top-0 h-2 w-2 bg-brand-500 shadow-[1px_1px_0_rgba(10,27,77,.7)]" />
          <span className="absolute left-3 top-3 h-2 w-2 bg-success-500 shadow-[1px_1px_0_rgba(10,27,77,.7)]" />
          <span className="absolute left-3 top-0 h-2 w-2 bg-brand-300 shadow-[1px_1px_0_rgba(10,27,77,.7)]" />
          <span className="absolute left-0 top-3 h-2 w-2 bg-success-300 shadow-[1px_1px_0_rgba(10,27,77,.7)]" />
          <span className="absolute left-2 top-2 h-2 w-2 bg-white shadow-[1px_1px_0_rgba(10,27,77,.7)]" />
        </div>
      </div>
      {/* 点击爆开像素方块的宿主层 */}
      <div ref={burstRef} className="absolute left-0 top-0" />
    </div>
  );
}
