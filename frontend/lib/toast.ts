"use client";

export type ToastType = "success" | "error" | "info";

const EVENT = "hc-toast";

export function showToast(msg: string, type: ToastType = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { msg, type } }));
}
