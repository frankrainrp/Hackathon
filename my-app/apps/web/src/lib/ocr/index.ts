import { uiText } from "../messages.ts";

import { appFetch as fetch } from "../messages.ts";
// ============================================================
// lib/ocr/index.ts — OCR 客户端统一入口
//
// 负责：file → 服务端 /api/ocr → markdown
// provider 由服务端读 OCR_PROVIDER env 决定（前端不暴露 key）
// ============================================================

export type OcrResponse =
  | { ok: true; text: string; pages: number; provider: string; ocrUsed: boolean }
  | { ok: false; error: string; needsConfig?: boolean };

// 兼容旧名导出
export type OcrResult = Extract<OcrResponse, { ok: true }>;
export type OcrError = Extract<OcrResponse, { ok: false }>;

/**
 * 调用服务端 /api/ocr 做识别。
 * 50MB 硬拒、10MB+ 仍然发送但服务端会 warn 日志。
 */
export async function runOcr(file: File): Promise<OcrResponse> {
  // 客户端硬限制
  if (file.size > 50 * 1024 * 1024) {
    return {
      ok: false,
      error: uiText("server.54f363b629d9", { value0: (file.size / 1024 / 1024).toFixed(1) }),
    };
  }

  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/ocr", { method: "POST", body: form });
  } catch (err) {
    return { ok: false, error: uiText("server.1964cdf5cabd", { value0: (err as Error).message }) };
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    let needsConfig = false;
    try {
      const j = await res.json();
      detail = j.error || detail;
      needsConfig = !!j.needsConfig;
    } catch { /* ignore */ }
    return { ok: false, error: detail, needsConfig };
  }

  try {
    const j = await res.json();
    if (!j.ok) return { ok: false, error: j.error || uiText("server.13a46616e16f") };
    return {
      ok: true,
      text: j.text || "",
      pages: j.pages || 1,
      provider: j.provider || "unknown",
      ocrUsed: !!j.ocrUsed,
    };
  } catch (err) {
    return { ok: false, error: uiText("server.03c46491c76c", { value0: (err as Error).message }) };
  }
}
