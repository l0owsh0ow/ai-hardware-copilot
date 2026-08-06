import type { BOMTable, Component, ComponentDetail, StructuredParams } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`请求失败 (${resp.status}): ${detail.slice(0, 200)}`);
  }
  return resp.json() as Promise<T>;
}

export async function parseRequirement(text: string) {
  const data = await post<{ params: StructuredParams }>("/api/v1/parse", { text });
  return data.params;
}

export async function fetchRecommendations(params: StructuredParams) {
  const data = await post<{ recommendations: Component[] }>("/api/v1/recommend", {
    params,
  });
  return data.recommendations;
}

export async function generateBom(
  selections: { part_number: string; quantity: number }[],
  projectName: string
) {
  const data = await post<{ bom: BOMTable }>("/api/v1/bom/generate", {
    selections,
    project_name: projectName,
  });
  return data.bom;
}

export async function fetchComponent(id: string) {
  const resp = await fetch(`${API_BASE}/api/v1/components/${encodeURIComponent(id)}`);
  if (!resp.ok) throw new Error(`获取元器件失败 (${resp.status})`);
  const data = (await resp.json()) as { component: ComponentDetail };
  return data.component;
}

export function exportBomUrl(
  bomId: string,
  format: "excel" | "csv",
  quantities?: Record<string, number>
) {
  const params = new URLSearchParams({ format });
  if (quantities && Object.keys(quantities).length > 0) {
    params.set(
      "quantities",
      Object.entries(quantities)
        .map(([part, qty]) => `${part}:${qty}`)
        .join(",")
    );
  }
  return `${API_BASE}/api/v1/bom/${encodeURIComponent(bomId)}/export?${params.toString()}`;
}
