"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const COLS = 22;
const ROWS = 14;
const PALETTE = ["#f4f7fb", "#f4f7fb", "#eaf1ff", "#2f6bff", "#f4f7fb", "#12b76a", "#f4f7fb", "#8a6a3c"];

/**
 * 路由切换过渡：新页面垫满一层密集小像素（非纯白，取自页面配色），
 * 按不同位置的随机先后分步移动 + 缩放，像页面像素被敲碎散落，露出新页面。
 * 延迟/时长/位移用固定散列生成，SSR 与客户端一致，避免水合警告。
 */
export default function BlockTransition() {
  const path = usePathname();
  const prev = useRef(path);
  const [breaking, setBreaking] = useState(false);

  useEffect(() => {
    if (prev.current === path) return;
    prev.current = path;
    setBreaking(true);
    const t = window.setTimeout(() => setBreaking(false), 1600);
    return () => window.clearTimeout(t);
  }, [path]);

  if (!breaking) return null;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const delay = ((i * 37) % 130) / 130 * 1.0;
    const dur = 0.32 + ((i * 53) % 42) / 100;
    const px = (((i * 7) % 5) - 2) * 18;
    const py = (((i * 13) % 5) - 2) * 20;
    cells.push(
      <div
        key={i}
        className="px-cell"
        style={{
          backgroundColor: PALETTE[i % PALETTE.length],
          ["--delay" as never]: `${delay}s`,
          ["--dur" as never]: `${dur}s`,
          ["--px" as never]: `${px}px`,
          ["--py" as never]: `${py}px`,
        }}
      />
    );
  }

  return (
    <div className="block-trans breaking" aria-hidden="true">
      {cells}
    </div>
  );
}
