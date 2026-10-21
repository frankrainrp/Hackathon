import { existsSync, mkdirSync, statSync, lstatSync, realpathSync, readFileSync, readdirSync, renameSync, unlinkSync, statfsSync, createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { aiDataDir, atomicJson, readAiSettings } from "./ai-config.ts";
import { catalogModel, MODEL_CATALOG, type CatalogModel } from "./ai-catalog.ts";

export interface DownloadStatus { id: string; directory: string; state: "downloading" | "verifying" | "paused" | "ready" | "error"; received: number; total: number; error?: string; updated: number }
type Job = { controller: AbortController; done: Promise<void>; status: DownloadStatus };
const shared = globalThis as typeof globalThis & { butlerDownloads?: Map<string, Job> };
const jobs = shared.butlerDownloads ||= new Map();
export function modelDirectory(raw: string) {
  if (!isAbsolute(raw) || raw.length > 500 || /^(\\\\|\/\/)/.test(raw) || raw.includes("\0") || (process.platform === "win32" && !/^[a-zA-Z]:[\\/]/.test(raw))) throw new Error("Choose an absolute folder on a local drive. Network and device paths are not supported.");
  mkdirSync(raw, { recursive: true });
  if (!statSync(raw).isDirectory()) throw new Error("Choose a writable model folder.");
  const canonical = realpathSync(raw);
  if (/^(\\\\|\/\/)/.test(canonical)) throw new Error("Choose a folder on a local drive. A linked network folder is not supported.");
  return canonical;
}
export function modelFile(directory: string, filename: string) {
  if (!/^[a-zA-Z0-9._-]+\.gguf(?:\.part)?$/.test(filename)) throw new Error("Invalid model filename.");
  const path = join(modelDirectory(directory), filename);
  if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) throw new Error("Model files must be regular local files, not links.");
  return path;
}
const journalPath = (id: string) => join(aiDataDir(), "downloads", id + ".json");
function persist(status: DownloadStatus) { status.updated = Date.now(); atomicJson(journalPath(status.id), status); }
export function downloadStatuses() {
  const folder = join(aiDataDir(), "downloads");
  if (!existsSync(folder)) return [];
  return MODEL_CATALOG.flatMap(model => {
    const path = journalPath(model.id);
    if (!existsSync(path)) return [];
    try {
      const s = JSON.parse(readFileSync(path, "utf8")) as DownloadStatus;
      const active = jobs.get(model.id);
      if (active) return [active.status];
      if (["downloading", "verifying"].includes(s.state)) s.state = "paused";
      const partial = modelFile(s.directory, model.file + ".part");
      if (existsSync(partial)) s.received = statSync(partial).size;
      return [s];
    } catch { return []; }
  });
}
export async function sha256File(path: string, signal?: AbortSignal) {
  const hash = createHash("sha256");
  const stream = createReadStream(path, { signal });
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}
export async function verifyModel(directory: string, id: string) {
  const model = catalogModel(id), path = modelFile(directory, model.file);
  if (!existsSync(path) || statSync(path).size !== model.bytes) throw new Error("The model is incomplete. Download or resume it in Prepare.");
  if (await sha256File(path) !== model.sha256) throw new Error("Model checksum failed. Remove this file from the model folder and download it again.");
  return path;
}
export function listModels(directory: string) {
  const root = modelDirectory(directory);
  // Only the chosen directory, never recursive private-file discovery.
  return readdirSync(root).filter(name => name.endsWith(".gguf")).slice(0, 100).flatMap(name => {
    try { const path = modelFile(root, name); const m = MODEL_CATALOG.find(m => m.file === name); return [{ filename: name, id: m?.id || null, bytes: statSync(path).size, catalog: !!m }]; } catch { return []; }
  });
}

// Separate transfer core enables deterministic interruption/integrity tests using a synthetic HTTP server.
// Production only supplies catalog URLs; the HTTP API accepts no URL, hash, filename or arbitrary command.
export async function transferModel(model: CatalogModel, directory: string, controller: AbortController, status: DownloadStatus,
  url = `https://huggingface.co/${model.repo}/resolve/${model.revision}/${model.file}`, save: (s: DownloadStatus) => void = persist) {
  const partial = modelFile(directory, model.file + ".part"), final = modelFile(directory, model.file);
  let received = existsSync(partial) ? statSync(partial).size : 0;
  if (received > model.bytes) throw new Error("Partial file exceeds the expected model size. Remove the .part file and retry.");
  const fs = statfsSync(directory);
  if (Number(fs.bavail) * Number(fs.bsize) < model.bytes - received + 512 * 1024 ** 2) throw new Error("Not enough disk space. Free space or choose another folder, then resume.");
  status.received = received; status.state = "downloading"; save(status);
  if (received < model.bytes) {
    // Time out stalled transfers, not a healthy multi-gigabyte download on a slow link.
    const idle = new AbortController();
    let timeout = setTimeout(() => idle.abort(), 120000);
    const touch = () => { clearTimeout(timeout); timeout = setTimeout(() => idle.abort(), 120000); };
    try {
    const response = await fetch(url, { headers: received ? { Range: `bytes=${received}-` } : {}, signal: AbortSignal.any([controller.signal, idle.signal]) });
    if (![200, 206].includes(response.status) || !response.body) throw new Error(`Download server returned ${response.status}. Check your connection and resume.`);
    if (response.status === 206) {
      const expected = `bytes ${received}-${model.bytes - 1}/${model.bytes}`;
      if (response.headers.get("content-range") !== expected) { await response.body.cancel(); throw new Error("Download server returned an unexpected range. Retry after checking the partial file."); }
    } else if (received) { received = 0; status.received = 0; }
    const file = await open(partial, received ? "a" : "w", 0o600);
    let lastSaved = 0;
    try {
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        controller.signal.throwIfAborted();
        if (received + chunk.byteLength > model.bytes) throw new Error("Download exceeded the catalog size. Transfer stopped.");
        await file.write(chunk); touch(); received += chunk.byteLength; status.received = received;
        if (Date.now() - lastSaved > 500) { save(status); lastSaved = Date.now(); }
      }
    } finally { await file.close(); }
    } finally { clearTimeout(timeout); }
  }
  if (received !== model.bytes) throw new Error("Download interrupted before completion. Choose Resume to continue.");
  status.state = "verifying"; save(status);
  if (await sha256File(partial, controller.signal) !== model.sha256) {
    unlinkSync(partial);
    status.received = 0;
    throw new Error("Checksum failed. The damaged partial file was removed. Download again on a reliable connection.");
  }
  renameSync(partial, final); status.state = "ready"; status.error = undefined; save(status);
}
export function startDownload(id: string, confirmed: boolean) {
  if (confirmed !== true) throw new Error("Confirm the model size and license before downloading.");
  if (jobs.size) throw new Error("Another download is active. Pause it before starting a different download.");
  const model = catalogModel(id), directory = modelDirectory(readAiSettings().modelsDir);
  const status: DownloadStatus = { id, directory, state: "downloading", received: 0, total: model.bytes, updated: Date.now() };
  const controller = new AbortController();
  const job: Job = { controller, status, done: Promise.resolve() };
  jobs.set(id, job);
  job.done = transferModel(model, directory, controller, status).catch(error => {
    status.state = controller.signal.aborted ? "paused" : "error";
    const code = (error as NodeJS.ErrnoException).code;
    status.error = controller.signal.aborted ? "Paused. Partial bytes are kept; choose Resume when ready." : code === "ENOSPC" ? "Disk full. Free space or use another model folder." : error instanceof TypeError ? "Download unavailable. Check internet access to Hugging Face, then resume." : String(error.message || "Download failed. Resume when ready.");
    persist(status);
  }).finally(() => jobs.delete(id));
  return status;
}
export async function cancelDownload(id: string) {
  const job = jobs.get(id);
  if (job) { job.controller.abort(); await job.done; }
  return downloadStatuses();
}
