import { uiText } from "../../../../lib/messages.ts";
import { generationLanguage } from "@/lib/api-language";
import { withUiLanguage } from "@/lib/api-language";
import { join } from "node:path";
import { existsSync, unlinkSync } from "node:fs";
import { aiDataDir, readAiSettings, saveAiSettings, saveDeepseekKey, hasDeepseekKey, isLocalAiRequest, validateSettings } from "@/lib/ai-config";
import { CATALOG_VERSION, MODEL_CATALOG, ALL_MODEL_CATALOG, recommendations } from "@/lib/ai-catalog";
import { hardwareSummary, memorySummary } from "@/lib/ai-hardware";
import { defaultModelsDirectory } from "@/lib/ai-paths";
import { contextPlan } from "@/lib/ai-context";
import { modelDirectory, listModels, downloadStatuses, startDownload, cancelDownload } from "@/lib/ai-download";
import { engineProbe, engineStatus, startEngine, stopEngine } from "@/lib/ai-engine";
import { providerModels, completeWithProvider, providerError, resolveProviderCandidates } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
const shared = globalThis as typeof globalThis & { butlerSetupBusy?: boolean };
async function handleGET(req: Request) {
  if (!isLocalAiRequest(req)) return json({ error: uiText("server.641c510983e7") }, 403);
  try {
    const settings = readAiSettings();
    return json({ settings, defaultModelsDir: defaultModelsDirectory(), memory: memorySummary(), keyPresent: hasDeepseekKey(), protectedStorage: process.platform === "win32", catalog: MODEL_CATALOG, catalogVersion: CATALOG_VERSION,
      modelNames: { primary: settings.mode === "none" ? null : settings.mode === "deepseek" ? settings.deepseekModel : settings.mode === "local" ? (settings.localKind === "external" ? settings.externalModel : ALL_MODEL_CATALOG.find(m => m.id === settings.modelId)?.label || "") : process.env.OLLAMA_SERVER_MODEL || null, alternate: settings.mode === "legacy" && process.env.OLLAMA_WINDOWS_BASE_URL ? process.env.OLLAMA_WINDOWS_MODEL || process.env.OLLAMA_SERVER_MODEL || null : null },
      downloads: downloadStatuses(), engine: await engineStatus(), legacyAvailable: !!process.env.OLLAMA_SERVER_BASE_URL });
  } catch { return json({ error: uiText("server.680390134140") }, 500); }
}
async function handlePOST(req: Request) {
  if (!isLocalAiRequest(req, true)) return json({ error: uiText("server.b91ac691712d") }, 403);
  if (Number(req.headers.get("content-length") || 0) > 16384) return json({ error: uiText("server.4306846aecda") }, 413);
  let body: Record<string, unknown>;
  try { const text = await req.text(); if (Buffer.byteLength(text) > 16384) return json({ error: uiText("server.4306846aecda") }, 413); body = JSON.parse(text); } catch { return json({ error: uiText("server.70fddef4dd5b") }, 400); }
  if (!body || typeof body.action !== "string") return json({ error: uiText("server.f50f43ece3cd") }, 400);
  if (shared.butlerSetupBusy) return json({ error: uiText("server.5060e48ce22e") }, 409);
  shared.butlerSetupBusy = true;
  try {
    switch (body.action) {
      case "save": {
        const old = readAiSettings(), next = validateSettings(body.settings);
        const model = MODEL_CATALOG.find(m => m.id === next.modelId);
        if (next.contextMode === "auto" && model) next.context = next.modelId === old.modelId && old.contextMode === "auto" && (await engineStatus()).state === "ready" ? old.context : contextPlan(model, memorySummary()).recommended;
        if (next.modelsDir !== old.modelsDir && downloadStatuses().some(s => ["downloading", "verifying"].includes(s.state))) throw new Error(uiText("server.bce9fd9ad5d7"));
        if (["mode", "localKind", "modelId", "context", "modelsDir"].some(key => next[key] !== old[key])) await stopEngine();
        return json({ ok: true, settings: saveAiSettings(next) });
      }
      case "save-key": saveDeepseekKey(body.key as string); return json({ ok: true, keyPresent: true, message: uiText("server.c4206d8a6ee3") });
      case "delete-key": { const path = join(aiDataDir(), "deepseek.dpapi"); if (existsSync(path)) unlinkSync(path); return json({ ok: true, keyPresent: false }); }
      case "hardware": { const s = readAiSettings(); const hardware = hardwareSummary(s.modelsDir, body.includeGpu === true), probe = engineProbe(); hardware.bundledCpu = hardware.bundledCpu && probe.available; return json({ ok: true, hardware, recommendations: recommendations(hardware), probe, models: listModels(s.modelsDir) }); }
      case "folder": {
        if (downloadStatuses().some(s => ["downloading", "verifying"].includes(s.state))) throw new Error(uiText("server.bce9fd9ad5d7"));
        const s = readAiSettings(), automatic = body.useDefault === true;
        const directory = modelDirectory(automatic ? defaultModelsDirectory() : String(body.directory || "").trim());
        if (s.modelsDir !== directory) await stopEngine();
        const settings = saveAiSettings({ ...s, modelsDir: directory, modelsDirMode: automatic ? "auto" : "custom" });
        return json({ ok: true, settings, directory, models: listModels(directory) });
      }
      case "download": return json({ ok: true, download: startDownload(String(body.id), body.confirm === true) });
      case "cancel": return json({ ok: true, downloads: await cancelDownload(String(body.id)) });
      case "start": return json({ ok: true, engine: await startEngine() });
      case "stop": return json({ ok: true, engine: await stopEngine() });
      case "models": return json({ ok: true, models: await providerModels() });
      case "test": {
        const endpoints = resolveProviderCandidates(), models = await providerModels(), selected = endpoints[0].model;
        if (!models.includes(selected) && endpoints[0].mode !== "legacy") throw new Error(uiText("server.6fd741f8c8af"));
        return json({ ok: true, message: uiText("server.456d5cbccd74"), model: selected });
      }
      case "sample": {
        if (body.confirm !== true) throw new Error(uiText("server.8672a8322019"));
        const result = await completeWithProvider({ messages: [{ role: "system", content: ("Reply briefly. Do not call tools or change any records.") + "\n\n" + generationLanguage(req) }, { role: "user", content: "Explain a study plan in one sentence. This is a synthetic setup check, not school data. /no_think" }], max_tokens: 128, temperature: 0.2 });
        return json({ ok: true, sample: result.choices[0]?.message.content?.slice(0, 2000) || uiText("ai.sampleEmpty"), message: uiText("server.401956f7cacf") });
      }
      default: return json({ error: uiText("server.1454df457195") }, 400);
    }
  } catch (error) { return json({ ok: false, error: providerError(error) }, 400); }
  finally { shared.butlerSetupBusy = false; }
}

export const GET = withUiLanguage(handleGET);
export const POST = withUiLanguage(handlePOST);
