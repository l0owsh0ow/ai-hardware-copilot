"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const COLS = 22;
const ROWS = 14;

/**
 * 路由切换过渡：新页面垫满一层密集小像素，按「不同位置随机」逐个溶解消失，
 * 形成像素点碎散的效果，露出新页面。pointer-events:none，不阻塞交互。
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
    const dur = 0.28 + ((i * 53) % 45) / 100;
    const dx = (((i * 7) % 11) - 5) * 7;
    const dy = (((i * 13) % 9) - 4) * 8;
    cells.push(
      <div
        key={i}
        className="px-cell"
        style={{
          ["--delay" as never]: `${delay}s`,
          ["--dur" as never]: `${dur}s`,
          ["--dx" as never]: `${dx}px`,
          ["--dy" as never]: `${dy}px`,
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
