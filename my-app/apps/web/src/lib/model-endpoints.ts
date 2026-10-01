import type { AiModelId } from "./ai-models";

export interface ModelEndpoint { name: "server" | "windows"; baseURL: string; model?: string }

/** Shared by normal chat and the LMS brief; no duplicate provider or model key. */
export function endpointCandidates(modelId: AiModelId): ModelEndpoint[] {
  const server: ModelEndpoint = {
    name: "server",
    baseURL: process.env.OLLAMA_SERVER_BASE_URL || process.env.DEEPSEEK_BASE_URL || "http://ollama:11434/v1",
    model: process.env.OLLAMA_SERVER_MODEL,
  };
  const windowsUrl = process.env.OLLAMA_WINDOWS_BASE_URL?.trim();
  if (!windowsUrl) return [server];
  const windows: ModelEndpoint = { name: "windows", baseURL: windowsUrl, model: process.env.OLLAMA_WINDOWS_MODEL };
  return modelId === "deepseek-v4-thinking" ? [windows, server] : [server, windows];
}
