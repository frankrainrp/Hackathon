import { uiText } from "./messages.ts";
import OpenAI from "openai";
import { readAiSettings, readDeepseekKey, loopbackURL } from "./ai-config.ts";
import { engineCredential, engineModelName, ENGINE_PORT } from "./ai-engine.ts";
import type { AiModelId } from "./ai-models.ts";

export interface ProviderEndpoint { name: "server" | "windows" | "bundled" | "local" | "deepseek"; baseURL: string; model: string; apiKey: string; mode: string }
export function providerError(error: unknown): string {
  const e = error as { status?: number; code?: string };
  if (e?.status === 401 || e?.status === 403) return uiText("server.1acca6e77b25");
  if (e?.status === 402) return uiText("server.df902f72e555");
  if (e?.status === 429) return uiText("server.6285b8f9aaed");
  if (e?.status === 404) return uiText("server.6b827aa2da9b");
  if (e?.status === 400 || e?.status === 422) return uiText("server.61a76d4d0d24");
  if (e?.status === 500 || e?.status === 503) return uiText("server.5a3c4d77030c");
  // Never forward provider bodies, headers, keys or URLs.
  if (error instanceof Error && !(error instanceof OpenAI.APIError) && !(error instanceof OpenAI.APIConnectionError) && !/fetch|connect|socket|timeout|ECONN|ENOTFOUND/i.test(error.message)) return error.message.slice(0, 350);
  return uiText("server.ce6136527215");
}
export function resolveProviderCandidates(modelId: AiModelId = "deepseek-v4-flash"): ProviderEndpoint[] {
  const s = readAiSettings();
  if (s.mode === "none") throw new Error(uiText("server.aade800f39d7"));
  if (s.mode === "deepseek") return [{ name: "deepseek", mode: s.mode, baseURL: "https://api.deepseek.com", model: s.deepseekModel, apiKey: readDeepseekKey() }];
  if (s.mode === "local") {
    if (s.localKind === "external") {
      if (!s.externalModel) throw new Error(uiText("server.95d309058bc3"));
      return [{ name: "local", mode: s.mode, baseURL: loopbackURL(s.externalURL), model: s.externalModel, apiKey: "local-no-key" }];
    }
    return [{ name: "bundled", mode: s.mode, baseURL: `http://127.0.0.1:${ENGINE_PORT}/v1`, model: engineModelName(), apiKey: engineCredential() }];
  }
  // Explicit legacy mode preserves primary/alternate ordering. DEEPSEEK_* is never a local fallback.
  if (!process.env.OLLAMA_SERVER_MODEL?.trim()) throw new Error(uiText("ai.legacy.modelRequired"));
  const primary: ProviderEndpoint = { name: "server", mode: s.mode, baseURL: process.env.OLLAMA_SERVER_BASE_URL || "http://127.0.0.1:11434/v1", model: process.env.OLLAMA_SERVER_MODEL.trim(), apiKey: process.env.OLLAMA_API_KEY || "ollama" };
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
      return Array.from(new Set(result.data.slice(0, 100).map(m => m.id).filter(id => typeof id === "string" && !!id.trim() && id.trim() === id && id.length <= 150 && !/[\x00-\x1f\x7f]/.test(id))));
    } catch (err) { last = err; }
  }
  throw new Error(providerError(last));
}
