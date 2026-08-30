"use client";

let sessionId = "";

export function track(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (!sessionId) {
    sessionId =
      sessionStorage.getItem("hc_session") ||
      `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("hc_session", sessionId);
  }
  const token = process.env.NEXT_PUBLIC_API_TOKEN || "";
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  fetch(`${base}/api/v1/analytics/event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-API-Token": token } : {}),
    },
    body: JSON.stringify({ event, session_id: sessionId, payload }),
  }).catch(() => {
    /* 埋点失败不影响业务 */
  });
}
