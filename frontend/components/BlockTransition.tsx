"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * 路由切换过渡：新页面下方垫满一层「方块」，按网格顺序被撸下来（破碎坠落），
 * 从而呈现我的世界式地露出新页面。pointer-events:none，不阻塞交互。
 */
export default function BlockTransition() {
  const path = usePathname();
  const prev = useRef(path);
  const [breaking, setBreaking] = useState(false);

  useEffect(() => {
    if (prev.current === path) return;
    prev.current = path;
    setBreaking(true);
    const t = window.setTimeout(() => setBreaking(false), 1150);
    return () => window.clearTimeout(t);
  }, [path]);

  if (!breaking) return null;
  return (
    <div className="block-trans breaking" aria-hidden="true">
      {Array.from({ length: 84 }).map((_, i) => (
        <div key={i} className="bt-cell" style={{ ["--i" as never]: i }} />
      ))}
    </div>
  );
}
