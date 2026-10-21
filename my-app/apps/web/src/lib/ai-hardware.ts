import { platform, arch, totalmem, freemem } from "node:os";
import { statfsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { HardwareSummary } from "./ai-catalog.ts";

export function hardwareSummary(directory: string): HardwareSummary {
  const notes: string[] = [];
  let diskGiB: number | null = null;
  try { mkdirSync(directory, { recursive: true }); const fs = statfsSync(directory); diskGiB = Number(fs.bavail) * Number(fs.bsize) / 2 ** 30; } catch { notes.push("The selected folder is unavailable. Choose a writable local folder."); }
  let gpus: HardwareSummary["gpus"] = [];
  if (platform() === "win32") {
    try {
      const output = execFileSync("nvidia-smi.exe", ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"], { encoding: "utf8", windowsHide: true, timeout: 5000, stdio: ["ignore", "pipe", "ignore"] });
      gpus = output.trim().split(/\r?\n/).filter(Boolean).map(line => { const [name, mem] = line.split(","); return { name: name.trim(), vramGiB: Number.isFinite(Number(mem)) ? Number(mem) / 1024 : null }; });
    } catch {
      try {
        const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "@(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) | ConvertTo-Json -Compress"], { encoding: "utf8", windowsHide: true, timeout: 8000, stdio: ["ignore", "pipe", "ignore"] });
        const names = JSON.parse(output); gpus = (Array.isArray(names) ? names : [names]).filter(x => typeof x === "string").map(name => ({ name, vramGiB: null }));
      } catch { notes.push("GPU details unavailable. No GPU performance or VRAM assumption is made."); }
    }
  }
  notes.push("Only OS, architecture, RAM, GPU name/VRAM and selected-drive free space are read. No serial numbers or personal files are inspected; this summary is not uploaded.");
  notes.push("CPU instruction support is confirmed by the bundled engine probe. A listed GPU does not prove that a compatible backend is installed.");
  return { os: platform(), arch: arch(), ramGiB: totalmem() / 2 ** 30, freeRamGiB: freemem() / 2 ** 30, diskGiB, gpus, bundledCpu: platform() === "win32" && arch() === "x64", notes };
}
