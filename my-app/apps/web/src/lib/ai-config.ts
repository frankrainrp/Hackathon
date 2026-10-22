import { uiText } from "./messages.ts";
// Server-only persistence. Never import this module from a client component.
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, readdirSync } from "node:fs";
import { resolve, join, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";
import { defaultModelsDirectory } from "./ai-paths.ts";
import { ALL_MODEL_CATALOG } from "./ai-catalog.ts";

export type AiMode = "none" | "local" | "deepseek" | "legacy";
export interface AiSettings {
  version: 1; mode: AiMode; onboarding: "new" | "paused" | "complete"; step: number;
  localKind: "bundled" | "external"; modelsDir: string; modelId: string;
  context: number; externalURL: string; externalModel: string;
  modelsDirMode: "auto" | "custom"; contextMode: "auto" | "manual";
  deepseekModel: "deepseek-flash" | "deepseek-v4-pro"; cloudOcr: boolean;
}
export const aiDataDir = () => resolve(process.env.BUTLER_AI_DATA_DIR || join(process.cwd(), ".private", "ai"));
export function defaults(): AiSettings {
  return { version: 1, mode: process.env.OLLAMA_SERVER_BASE_URL ? "legacy" : "none", onboarding: "new", step: 0,
    localKind: "bundled", modelsDir: defaultModelsDirectory(), modelsDirMode: "auto", modelId: "", context: 4096, contextMode: "auto",
    externalURL: "http://127.0.0.1:11434/v1", externalModel: "", deepseekModel: "deepseek-flash", cloudOcr: false };
}
export function atomicJson(file: string, value: unknown) {
  mkdirSync(resolve(file, ".."), { recursive: true, mode: 0o700 });
  writeFileSync(file + ".tmp", JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(file + ".tmp", file);
}
export function readAiSettings(): AiSettings {
  const file = join(aiDataDir(), "settings.json");
  if (!existsSync(file)) return defaults();
  // Invalid persisted configuration fails closed, never selects a cloud fallback.
  const raw = JSON.parse(readFileSync(file, "utf8"));
  if (!raw.modelsDirMode) {
    // Preserve old/custom model stores, especially complete or interrupted weights.
    const legacy = join(aiDataDir(), "models");
    const emptyLegacy = raw.modelsDir === legacy && (!existsSync(legacy) || readdirSync(legacy).length === 0);
    raw.modelsDirMode = emptyLegacy ? "auto" : "custom";
  }
  return validateSettings(raw);
}
export function loopbackURL(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password || url.search || url.hash || !/^\/v1\/?$/.test(url.pathname)) {
    throw new Error(uiText("server.3373a86808e5"));
  }
  return url.href.replace(/\/$/, "");
}
export function validateSettings(raw: unknown): AiSettings {
  const s = raw as AiSettings;
  if (!s || s.version !== 1 || !["none", "local", "deepseek", "legacy"].includes(s.mode) || !["new", "paused", "complete"].includes(s.onboarding) || !["bundled", "external"].includes(s.localKind)
    || !Number.isInteger(s.step) || s.step < 0 || s.step > 3 || !Number.isInteger(s.context) || s.context < (ALL_MODEL_CATALOG.find(m => m.id === s.modelId)?.minContext || 2048) || s.context > (ALL_MODEL_CATALOG.find(m => m.id === s.modelId)?.context || 262144)
    || (s.modelsDirMode !== undefined && !["auto", "custom"].includes(s.modelsDirMode)) || (s.contextMode !== undefined && !["auto", "manual"].includes(s.contextMode))
    || typeof s.modelsDir !== "string" || s.modelsDir.length > 500 || !isAbsolute(s.modelsDir) || /^(\\\\|\/\/)/.test(s.modelsDir) || s.modelsDir.includes("\0") || typeof s.modelId !== "string" || !/^[a-zA-Z0-9._-]{0,150}$/.test(s.modelId)
    || typeof s.externalModel !== "string" || s.externalModel.length > 150 || !["deepseek-flash", "deepseek-v4-pro"].includes(s.deepseekModel) || typeof s.cloudOcr !== "boolean") throw new Error(uiText("server.305c01cbb876"));
  // Explicit projection: credentials and unrelated app state cannot enter settings/exports.
  const modelsDirMode = s.modelsDirMode || "custom";
  return { version: 1, mode: s.mode, onboarding: s.onboarding, step: s.step, localKind: s.localKind, modelsDir: modelsDirMode === "auto" ? defaultModelsDirectory() : s.modelsDir, modelsDirMode, modelId: s.modelId,
    context: s.context, contextMode: s.contextMode || (s.context === 4096 ? "auto" : "manual"), externalURL: loopbackURL(s.externalURL), externalModel: s.externalModel.trim(), deepseekModel: s.deepseekModel, cloudOcr: s.cloudOcr };
}
export function saveAiSettings(raw: unknown) {
  const s = validateSettings(raw);
  atomicJson(join(aiDataDir(), "settings.json"), s);
  return s;
}

// DPAPI CurrentUser uses the interactive Windows account, not a machine-wide key.
// Input is piped to a fixed PowerShell program. No key in command line, env or logs.
function dpapi(input: string, decrypt: boolean) {
  if (process.platform !== "win32") throw new Error(uiText("server.5ff066170210"));
  const program = `Add-Type -AssemblyName System.Security; $v=[Console]::In.ReadToEnd(); $bytes=[Convert]::FromBase64String($v); $out=[Security.Cryptography.ProtectedData]::${decrypt ? "Unprotect" : "Protect"}($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($out))`;
  const r = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", program], { input, encoding: "utf8", windowsHide: true, timeout: 15000, maxBuffer: 65536 });
  if (r.error || r.status !== 0 || !/^[A-Za-z0-9+/=]+$/.test(r.stdout.trim())) throw new Error(uiText("server.7d530b94d00d"));
  return r.stdout.trim();
}
export const hasDeepseekKey = () => existsSync(join(aiDataDir(), "deepseek.dpapi"));
export function saveDeepseekKey(key: string) {
  if (typeof key !== "string" || key.length < 12 || key.length > 300 || /\s/.test(key)) throw new Error(uiText("server.395141d7c4b4"));
  const encrypted = dpapi(Buffer.from(key).toString("base64"), false);
  mkdirSync(aiDataDir(), { recursive: true, mode: 0o700 });
  writeFileSync(join(aiDataDir(), "deepseek.dpapi.tmp"), encrypted, { mode: 0o600 });
  renameSync(join(aiDataDir(), "deepseek.dpapi.tmp"), join(aiDataDir(), "deepseek.dpapi"));
}
export function readDeepseekKey() {
  if (!hasDeepseekKey()) throw new Error(uiText("server.7183d3d86f39"));
  return Buffer.from(dpapi(readFileSync(join(aiDataDir(), "deepseek.dpapi"), "utf8"), true), "base64").toString("utf8");
}
export function isLocalAiRequest(req: Request, mutation = false) {
  try {
    const host = req.headers.get("host") || new URL(req.url).host;
    const target = new URL(`http://${host}`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || req.headers.get("sec-fetch-site") === "cross-site") return false;
    const origin = req.headers.get("origin");
    if (mutation && !origin) return false;
    if (origin) {
      const o = new URL(origin);
      if (o.protocol !== new URL(req.url).protocol || o.host !== host) return false;
    }
    return true;
  } catch { return false; }
}
