"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#2f6bff", "#12b76a", "#8fb4ff", "#64d69b", "#ffffff"];

/**
 * 自定义鼠标指针：钻石镐跟随光标（隐藏系统指针），点击时挥动一下（模拟撸方块），
 * 并在指尖爆开一圈像素方块。整个跟随用 ref + rAF，不触发 React 重渲染。
 * 尊重 prefers-reduced-motion：开启时不启用，保留系统光标。
 */
export default function CursorFX() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pickRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    document.body.classList.add("has-fx");

    let tx = -200, ty = -200, gx = -200, gy = -200, px = -200, py = -200;
    let raf = 0;

    function spawnBurst(x: number, y: number) {
      const host = burstRef.current;
      if (!host) return;
      for (let i = 0; i < 10; i++) {
        const el = document.createElement("span");
        const size = 4 + Math.random() * 6;
        const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
        const dist = 12 + Math.random() * 24;
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
          el.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) rotate(${Math.random() * 360}deg)`;
          el.style.opacity = "0";
        });
        window.setTimeout(() => el.remove(), 560);
      }
    }

    function swing() {
      const wrap = pickRef.current?.querySelector(".cursor-img-wrap");
      if (!wrap) return;
      wrap.classList.remove("cursor-swing");
      void (wrap as HTMLElement).offsetWidth;
      wrap.classList.add("cursor-swing");
    }

    function onMove(e: PointerEvent) {
      tx = e.clientX;
      ty = e.clientY;
      if (glowRef.current) glowRef.current.style.opacity = "1";
      if (pickRef.current) pickRef.current.style.opacity = "1";
    }
    function onLeave() {
      if (glowRef.current) glowRef.current.style.opacity = "0";
      if (pickRef.current) pickRef.current.style.opacity = "0";
    }
    function onDown(e: PointerEvent) {
      spawnBurst(e.clientX, e.clientY);
      swing();
    }

    function tick() {
      gx += (tx - gx) * 0.16;
      gy += (ty - gy) * 0.16;
      px += (tx - px) * 0.32;
      py += (ty - py) * 0.32;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
      }
      if (pickRef.current) {
        pickRef.current.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
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
      document.body.classList.remove("has-fx");
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
      <div
        ref={glowRef}
        className="absolute left-0 top-0 h-40 w-40 opacity-0 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle, rgba(47,107,255,.22) 0%, rgba(18,183,106,.1) 45%, transparent 70%)",
        }}
      />
      {/* 钻石镐指针 */}
      <div ref={pickRef} className="absolute left-0 top-0 h-14 w-14 opacity-0 transition-opacity duration-300">
        <div className="cursor-img-wrap h-full w-full">
          <img
            src="/cursor/pickaxe.png"
            alt=""
            draggable={false}
            className="cursor-img h-full w-full"
          />
        </div>
      </div>
      <div ref={burstRef} className="absolute left-0 top-0" />
    </div>
  );
}
