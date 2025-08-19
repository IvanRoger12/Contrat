// src/api.ts
export const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE || "";

// Helper fetch JSON (timeout + gestion 404)
async function requestJSON<T>(path: string, opts?: RequestInit, timeoutMs = 12000): Promise<T> {
  if (!API_BASE) throw new Error("API_BASE not set");
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts?.headers || {}),
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status}: ${txt || res.statusText}`) as any;
      (err as any).status = res.status;
      throw err;
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

// ===== Endpoints =====
export async function apiAnalyze(text: string): Promise<{
  summary: string;
  score: number;
  risk: "low" | "medium" | "high";
  clauses: { title: string; risk: "low" | "medium" | "high"; issue: string; suggestion: string }[];
  suggestions: string[];
}> {
  return await requestJSON(`/analyze`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// /qa est optionnel : si 404, on retombe côté front
export async function apiQA(text: string, question: string): Promise<{ clause: string; summary: string }[]> {
  try {
    return await requestJSON(`/qa`, {
      method: "POST",
      body: JSON.stringify({ text, question }),
    });
  } catch (e: any) {
    if (e?.status === 404) {
      const err = new Error("NO_QA_ENDPOINT");
      (err as any).code = "NO_QA_ENDPOINT";
      throw err;
    }
    throw e;
  }
}

export async function apiSign(payload: { fileName?: string; analyzedAt?: string; signer: string; email: string }) {
  return await requestJSON<{ id: string; at: string }>(`/sign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
