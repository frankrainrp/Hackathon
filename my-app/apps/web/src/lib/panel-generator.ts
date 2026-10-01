"use client";

// ============================================================
// lib/panel-generator.ts — 客户端调 AI 生成面板 schema（P2）
// ============================================================

import type { GeneratedPanelSpec } from "./panel-schema";

export type GenerateResult =
  | { ok: true; spec: GeneratedPanelSpec }
  | { ok: false; error: string };

export async function generatePanelSpec(prompt: string, signal?: AbortSignal): Promise<GenerateResult> {
  try {
    const res = await fetch("/api/generate-panel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal,
    });
    const json = (await res.json()) as { ok: boolean; spec?: GeneratedPanelSpec; error?: string };
    if (json.ok === true && json.spec) return { ok: true, spec: json.spec };
    return { ok: false, error: json.error ?? "生成失败" };
  } catch (e) {
    if ((e as Error).name === "AbortError") return { ok: false, error: "已取消" };
    return { ok: false, error: (e as Error).message };
  }
}
