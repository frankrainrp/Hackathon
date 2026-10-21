import { join } from "node:path";
import { existsSync, unlinkSync } from "node:fs";
import { aiDataDir, readAiSettings, saveAiSettings, saveDeepseekKey, hasDeepseekKey, isLocalAiRequest, validateSettings } from "@/lib/ai-config";
import { CATALOG_VERSION, MODEL_CATALOG, recommendations } from "@/lib/ai-catalog";
import { hardwareSummary } from "@/lib/ai-hardware";
import { modelDirectory, listModels, downloadStatuses, startDownload, cancelDownload } from "@/lib/ai-download";
import { engineProbe, engineStatus, startEngine, stopEngine } from "@/lib/ai-engine";
import { providerModels, completeWithProvider, providerError, resolveProviderCandidates } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
const shared = globalThis as typeof globalThis & { butlerSetupBusy?: boolean };
export async function GET(req: Request) {
  if (!isLocalAiRequest(req)) return json({ error: "Local access only." }, 403);
  try {
    const settings = readAiSettings();
    return json({ settings, keyPresent: hasDeepseekKey(), protectedStorage: process.platform === "win32", catalog: MODEL_CATALOG, catalogVersion: CATALOG_VERSION,
      downloads: downloadStatuses(), engine: await engineStatus(), legacyAvailable: !!process.env.OLLAMA_SERVER_BASE_URL });
  } catch { return json({ error: "AI configuration could not be read. Restore settings.json from your own backup or move it aside, then reopen setup. Other app data is separate." }, 500); }
}
export async function POST(req: Request) {
  if (!isLocalAiRequest(req, true)) return json({ error: "Use this app on its loopback address; cross-site requests are blocked." }, 403);
  if (Number(req.headers.get("content-length") || 0) > 16384) return json({ error: "Request too large." }, 413);
  let body: Record<string, unknown>;
  try { const text = await req.text(); if (Buffer.byteLength(text) > 16384) return json({ error: "Request too large." }, 413); body = JSON.parse(text); } catch { return json({ error: "Invalid JSON." }, 400); }
  if (!body || typeof body.action !== "string") return json({ error: "Choose a setup action." }, 400);
  if (shared.butlerSetupBusy) return json({ error: "A setup operation is still running. Wait for it to finish." }, 409);
  shared.butlerSetupBusy = true;
  try {
    switch (body.action) {
      case "save": {
        const old = readAiSettings(), next = validateSettings(body.settings);
        if (next.modelsDir !== old.modelsDir && downloadStatuses().some(s => ["downloading", "verifying"].includes(s.state))) throw new Error("Pause the active download before changing folders.");
        if (["mode", "localKind", "modelId", "context", "modelsDir"].some(key => next[key] !== old[key])) await stopEngine();
        return json({ ok: true, settings: saveAiSettings(next) });
      }
      case "save-key": saveDeepseekKey(body.key as string); return json({ ok: true, keyPresent: true, message: "Key protected with Windows DPAPI for this Windows account." });
      case "delete-key": { const path = join(aiDataDir(), "deepseek.dpapi"); if (existsSync(path)) unlinkSync(path); return json({ ok: true, keyPresent: false }); }
      case "hardware": { const s = readAiSettings(); const hardware = hardwareSummary(s.modelsDir); return json({ ok: true, hardware, recommendations: recommendations(hardware, s.context), probe: engineProbe(), models: listModels(s.modelsDir) }); }
      case "folder": {
        if (downloadStatuses().some(s => ["downloading", "verifying"].includes(s.state))) throw new Error("Pause the active download before changing folders.");
        const s = readAiSettings(), directory = modelDirectory(String(body.directory || ""));
        saveAiSettings({ ...s, modelsDir: directory });
        return json({ ok: true, directory, models: listModels(directory) });
      }
      case "download": return json({ ok: true, download: startDownload(String(body.id), body.confirm === true) });
      case "cancel": return json({ ok: true, downloads: await cancelDownload(String(body.id)) });
      case "start": return json({ ok: true, engine: await startEngine() });
      case "stop": return json({ ok: true, engine: await stopEngine() });
      case "models": return json({ ok: true, models: await providerModels() });
      case "test": {
        const endpoints = resolveProviderCandidates(), models = await providerModels(), selected = endpoints[0].model;
        if (!models.includes(selected) && endpoints[0].mode !== "legacy") throw new Error("The selected model is not listed by the service. Refresh models and choose an installed model.");
        return json({ ok: true, message: "Connection succeeded. The service lists the selected model. Send the sample to check text generation.", model: selected });
      }
      case "sample": {
        if (body.confirm !== true) throw new Error("Confirm before sending a sample. DeepSeek may charge for this request.");
        const result = await completeWithProvider({ messages: [{ role: "system", content: "Reply briefly in English. Do not call tools or change any records." }, { role: "user", content: "Explain a study plan in one sentence. This is a synthetic setup check, not school data. /no_think" }], max_tokens: 128, temperature: 0.2 });
        return json({ ok: true, sample: result.choices[0]?.message.content?.slice(0, 2000) || "The model returned no text. Try a different model or shorter context.", message: "Sample complete. Review AI suggestions before applying them." });
      }
      default: return json({ error: "Unknown setup action." }, 400);
    }
  } catch (error) { return json({ ok: false, error: providerError(error) }, 400); }
  finally { shared.butlerSetupBusy = false; }
}
