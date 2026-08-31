"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton({
  label = "返回",
  fallback = "/",
}: {
  label?: string;
  fallback?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="btn-secondary mb-4 !py-2 text-xs"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
