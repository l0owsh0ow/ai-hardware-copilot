"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`back-to-top flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 shadow-md transition-all hover:border-brand-300 hover:text-brand-600 ${
        visible ? "visible" : ""
      }`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      title="回到顶部"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
