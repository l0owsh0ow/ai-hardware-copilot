"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { ToastType } from "@/lib/toast";

interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

const STYLES: Record<ToastType, string> = {
  success: "bg-success-600",
  error: "bg-danger-600",
  info: "bg-ink-800",
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let nextId = 1;
    const handler = (e: Event) => {
      const { msg, type } = (e as CustomEvent).detail as { msg: string; type: ToastType };
      const id = nextId++;
      setToasts((prev) => [...prev, { id, msg, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    };
    window.addEventListener("hc-toast", handler);
    return () => window.removeEventListener("hc-toast", handler);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast pointer-events-auto inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${STYLES[t.type]}`}
        >
          {ICONS[t.type]}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
