"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 用 IntersectionObserver 监听页面顶部哨兵：离开视口即显示按钮
    const sentinel = document.createElement("div");
    sentinel.style.position = "absolute";
    sentinel.style.top = "0";
    sentinel.style.left = "0";
    sentinel.style.width = "1px";
    sentinel.style.height = "1px";
    document.body.appendChild(sentinel);
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    io.observe(sentinel);
    return () => {
      io.disconnect();
      sentinel.remove();
    };
  }, []);

  return (
    <button
      type="button"
      className={`back-to-top flex h-10 w-10 items-center justify-center rounded-full border border-ink-100 bg-white text-ink-500 shadow-lg transition-all hover:border-brand-300 hover:text-brand-600 ${
        visible ? "visible" : ""
      }`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      title="回到顶部"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
