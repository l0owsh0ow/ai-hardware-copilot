"use client";

import type { BOMTable, Component, StructuredParams } from "./types";

const KEYS = {
  params: "hc_params",
  recommendations: "hc_recommendations",
  bom: "hc_bom",
  selected: "hc_selected",
  query: "hc_query",
  degraded: "hc_degraded",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(value));
}

export const store = {
  getParams: () => read<StructuredParams>(KEYS.params),
  setParams: (p: StructuredParams) => write(KEYS.params, p),
  getRecommendations: () => read<Component[]>(KEYS.recommendations),
  setRecommendations: (r: Component[]) => write(KEYS.recommendations, r),
  getBom: () => read<BOMTable>(KEYS.bom),
  setBom: (b: BOMTable | null) => {
    if (b) write(KEYS.bom, b);
    else if (typeof window !== "undefined") window.sessionStorage.removeItem(KEYS.bom);
  },
  getSelected: () => read<string[]>(KEYS.selected) || [],
  setSelected: (ids: string[]) => write(KEYS.selected, ids),
  getQuery: () => read<string>(KEYS.query) || "",
  setQuery: (q: string) => write(KEYS.query, q),
  getDegraded: () => read<boolean>(KEYS.degraded) || false,
  setDegraded: (d: boolean) => write(KEYS.degraded, d),
};

export const CATEGORY_LABELS: Record<string, string> = {
  mcu: "MCU 主控芯片",
  sensor: "传感器",
  power: "电源管理",
  comm: "通信模块",
};
