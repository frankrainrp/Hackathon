import OpenAI from "openai";
import { readAiSettings, readDeepseekKey, loopbackURL } from "./ai-config.ts";
import { engineCredential, ENGINE_PORT } from "./ai-engine.ts";
import { catalogModel } from "./ai-catalog.ts";
import type { AiModelId } from "./ai-models.ts";

export interface ProviderEndpoint { name: "server" | "windows" | "bundled" | "local" | "deepseek"; baseURL: string; model: string; apiKey: string; mode: string }
export function providerError(error: unknown): string {
  const e = error as { status?: number; code?: string };
  if (e?.status === 401 || e?.status === 403) return "Authentication failed. Open AI setup and save a valid API key, or check your local service access settings.";
  if (e?.status === 402) return "DeepSeek reports insufficient balance. Check your account on the official platform, or switch to Local. Butler cannot add funds.";
  if (e?.status === 429) return "The provider is rate limited. Wait a moment and retry; reduce parallel research requests if this continues.";
  if (e?.status === 404) return "The selected model was not found. Refresh the local model list or choose an available DeepSeek model in AI setup.";
  if (e?.status === 400 || e?.status === 422) return "The model rejected this request format or context size. Try a shorter document, lower context, or a model with tool/JSON support.";
  if (e?.status === 500 || e?.status === 503) return "The provider is unavailable or overloaded. Retry later. For Local, check engine health and free RAM in AI setup.";
  // Never forward provider bodies, headers, keys or URLs.
  if (error instanceof Error && !(error instanceof OpenAI.APIError) && !(error instanceof OpenAI.APIConnectionError) && !/fetch|connect|socket|timeout|ECONN|ENOTFOUND/i.test(error.message)) return error.message.slice(0, 350);
  return "Could not reach the selected AI provider. Check internet access for DeepSeek, or start your local engine/service. Your work is saved; Local never falls back to cloud.";
}
export function resolveProviderCandidates(modelId: AiModelId = "deepseek-v4-flash"): ProviderEndpoint[] {
  const s = readAiSettings();
  if (s.mode === "none") throw new Error("AI is optional and currently off. Open Settings → AI setup to choose Local or DeepSeek. Courses, tasks and notes still work.");
  if (s.mode === "deepseek") return [{ name: "deepseek", mode: s.mode, baseURL: "https://api.deepseek.com", model: s.deepseekModel, apiKey: readDeepseekKey() }];
  if (s.mode === "local") {
    if (s.localKind === "external") {
      if (!s.externalModel) throw new Error("Choose an installed model from your local service in AI setup.");
      return [{ name: "local", mode: s.mode, baseURL: loopbackURL(s.externalURL), model: s.externalModel, apiKey: "local-no-key" }];
    }
    const model = catalogModel(s.modelId);
    return [{ name: "bundled", mode: s.mode, baseURL: `http://127.0.0.1:${ENGINE_PORT}/v1`, model: model.file, apiKey: engineCredential() }];
  }
  // Explicit legacy mode preserves primary/alternate ordering. DEEPSEEK_* is never a local fallback.
  const primary: ProviderEndpoint = { name: "server", mode: s.mode, baseURL: process.env.OLLAMA_SERVER_BASE_URL || "http://127.0.0.1:11434/v1", model: process.env.OLLAMA_SERVER_MODEL || "qwen3:0.6b", apiKey: process.env.OLLAMA_API_KEY || "ollama" };
  const alternate = process.env.OLLAMA_WINDOWS_BASE_URL?.trim();
  if (!alternate) return [primary];
  const secondary: ProviderEndpoint = { name: "windows", mode: s.mode, baseURL: alternate, model: process.env.OLLAMA_WINDOWS_MODEL || primary.model, apiKey: process.env.OLLAMA_API_KEY || "ollama" };
  return modelId === "deepseek-v4-thinking" ? [secondary, primary] : [primary, secondary];
}
export function providerClient(endpoint: ProviderEndpoint) {
  return new OpenAI({ apiKey: endpoint.apiKey, baseURL: endpoint.baseURL, timeout: 120000, maxRetries: 0 });
}
export async function completeWithProvider(params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, "model">, modelId?: AiModelId) {
  let last: unknown;
  for (const endpoint of resolveProviderCandidates(modelId)) {
    try {
      return await providerClient(endpoint).chat.completions.create({ ...params, model: endpoint.model,
        ...(endpoint.mode === "deepseek" ? { thinking: { type: "disabled" } } : {}) } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
    } catch (e) { last = e; }
  }
  throw new Error(providerError(last));
}
export async function providerModels() {
  const s = readAiSettings();
  const endpoints = s.mode === "local" && s.localKind === "external"
    ? [{ baseURL: loopbackURL(s.externalURL), apiKey: "local-no-key" }]
    : resolveProviderCandidates();
  let last: unknown;
  for (const e of endpoints) {
    try {
      const client = new OpenAI({ baseURL: e.baseURL, apiKey: e.apiKey, timeout: 15000, maxRetries: 0 });
      const result = await client.models.list();
      return result.data.slice(0, 100).map(m => m.id).filter(id => typeof id === "string" && id.length <= 150);
    } catch (err) { last = err; }
  }
  throw new Error(providerError(last));
}
