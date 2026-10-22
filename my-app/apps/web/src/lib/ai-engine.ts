import { uiText } from "./messages.ts";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { readAiSettings } from "./ai-config.ts";
import { verifyModel } from "./ai-download.ts";
import { catalogModel } from "./ai-catalog.ts";
import { contextPlan, estimatedModelGiB } from "./ai-context.ts";
import { hardwareSummary } from "./ai-hardware.ts";

export const ENGINE_PORT = 18639;
type Runtime = { child?: ChildProcess; key: string; state: "stopped" | "starting" | "ready" | "error"; error?: string; model?: string; context?: number };
const shared = globalThis as typeof globalThis & { butlerEngine?: Runtime };
const engine = shared.butlerEngine ||= { key: randomBytes(32).toString("hex"), state: "stopped" };
export const engineDirectory = () => resolve(process.env.BUTLER_ENGINE_DIR || "../../../runtime/llama");
export function engineProbe() {
  if (process.platform !== "win32" || process.arch !== "x64") return { available: false, version: null, error: uiText("server.8e283532eb22") };
  const exe = join(engineDirectory(), "llama-server.exe");
  if (!existsSync(exe)) return { available: false, version: null, error: uiText("server.3d2632be2670") };
  const result = spawnSync(exe, ["--version"], { encoding: "utf8", windowsHide: true, timeout: 10000, stdio: ["ignore", "pipe", "pipe"] });
  return { available: !result.error && result.status === 0, version: (result.stdout + result.stderr).trim().slice(0, 300), error: result.error || result.status !== 0 ? uiText("server.3fd617a62203") : null };
}
export async function engineStatus() {
  if (engine.child && engine.child.exitCode === null) {
    try { const res = await fetch(`http://127.0.0.1:${ENGINE_PORT}/v1/models`, { headers: { Authorization: `Bearer ${engine.key}` }, signal: AbortSignal.timeout(1500) }); if (res.ok) engine.state = "ready"; } catch { /* Loading or stopped; do not infer cloud availability. */ }
  }
  return { state: engine.state, error: engine.error, model: engine.model, context: engine.context, url: `http://127.0.0.1:${ENGINE_PORT}/v1` };
}
export function engineCredential() {
  if (engine.state !== "ready" || !engine.child || engine.child.exitCode !== null) throw new Error(uiText("server.673edd68e2fa"));
  const s = readAiSettings();
  if (engine.model !== s.modelId || engine.context !== s.context) throw new Error(uiText("server.7951c7cf813d"));
  return engine.key;
}
export async function startEngine() {
  if (engine.state === "starting" || engine.child && engine.child.exitCode === null) throw new Error(uiText("server.494d67b683b1"));
  const s = readAiSettings();
  if (s.mode !== "local" || s.localKind !== "bundled") throw new Error(uiText("server.a8e0bc327335"));
  const probe = engineProbe(); if (!probe.available) throw new Error(probe.error || uiText("server.af3aa49cea74"));
  const model = catalogModel(s.modelId), h = hardwareSummary(s.modelsDir);
  if (h.ramGiB < model.minRamGiB || h.freeRamGiB < estimatedModelGiB(model, s.context) + contextPlan(model, h).reserveGiB) throw new Error(uiText("server.08a8d1907bc9"));
  engine.state = "starting"; engine.error = undefined;
  try {
    const file = await verifyModel(s.modelsDir, s.modelId);
    await new Promise<void>((ok, fail) => { const server = createServer(); server.once("error", () => fail(new Error(uiText("server.ad78294d64fc")))); server.listen(ENGINE_PORT, "127.0.0.1", () => server.close(() => ok())); });
    const child = spawn(process.execPath, [join(engineDirectory(), "engine-host.cjs"), join(engineDirectory(), "llama-server.exe"), file, String(s.context), String(ENGINE_PORT), engine.key], { windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"] });
    engine.child = child; engine.model = s.modelId; engine.context = s.context;
    child.on("error", () => { engine.state = "error"; engine.error = uiText("ai.recovery.16705afafc"); });
    child.on("exit", () => { if (engine.child !== child) return; if (engine.state !== "stopped") { engine.state = "error"; engine.error = uiText("ai.recovery.5381a1c088"); } });
    // UI polling continues while a large model loads; the request does not block for minutes.
    for (let i = 0; i < 8 && engine.state === "starting"; i++) { await delay(250); await engineStatus(); }
    return engineStatus();
  } catch (e) { engine.state = "error"; engine.error = (e as Error).message; throw e; }
}
export async function stopEngine() {
  const child = engine.child; engine.state = "stopped"; engine.error = undefined;
  if (child && child.exitCode === null) {
    const exited = new Promise<void>(ok => child.once("exit", () => ok()));
    if (child.connected) child.send("stop");
    await Promise.race([exited, delay(4000)]);
    if (child.exitCode === null) child.disconnect();
  }
  engine.child = undefined;
  return engineStatus();
}
