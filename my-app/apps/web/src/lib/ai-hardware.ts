import { uiText } from "./messages.ts";
import { platform, arch, totalmem, freemem } from "node:os";
import { statfsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { HardwareSummary } from "./ai-catalog.ts";

export function hardwareSummary(directory: string): HardwareSummary {
  const notes: string[] = [];
  let diskGiB: number | null = null;
  try { mkdirSync(directory, { recursive: true }); const fs = statfsSync(directory); diskGiB = Number(fs.bavail) * Number(fs.bsize) / 2 ** 30; } catch { notes.push(uiText("server.0e9e262bad90")); }
  let gpus: HardwareSummary["gpus"] = [];
  if (platform() === "win32") {
    try {
      const output = execFileSync("nvidia-smi.exe", ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"], { encoding: "utf8", windowsHide: true, timeout: 5000, stdio: ["ignore", "pipe", "ignore"] });
      gpus = output.trim().split(/\r?\n/).filter(Boolean).map(line => { const [name, mem] = line.split(","); return { name: name.trim(), vramGiB: Number.isFinite(Number(mem)) ? Number(mem) / 1024 : null }; });
    } catch {
      try {
        const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "@(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) | ConvertTo-Json -Compress"], { encoding: "utf8", windowsHide: true, timeout: 8000, stdio: ["ignore", "pipe", "ignore"] });
        const names = JSON.parse(output); gpus = (Array.isArray(names) ? names : [names]).filter(x => typeof x === "string").map(name => ({ name, vramGiB: null }));
      } catch { notes.push(uiText("server.cef12cb55925")); }
    }
  }
  notes.push(uiText("server.c159b7bc7392"));
  notes.push(uiText("server.6f984fa11d73"));
  return { os: platform(), arch: arch(), ramGiB: totalmem() / 2 ** 30, freeRamGiB: freemem() / 2 ** 30, diskGiB, gpus, bundledCpu: platform() === "win32" && arch() === "x64", notes };
}
