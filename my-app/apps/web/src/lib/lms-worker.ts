import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { uiText } from "./messages.ts";
import { configPath, readCatalog, readProfiles, saveProfile } from "./lms-profile-store.ts";
import { activeProfile, supportsSchoolConnection } from "./lms-profile.ts";
import { discoverProfile, latestSemester } from "./lms-discovery.ts";
import { enrichTermLabels } from "./lms-discovery-ai.ts";
import { updateLmsFeed } from "./server-db.ts";
import { applyProfileMetadata } from "./lms-sync.ts";

type Job = { profileId: string; state: "running" | "complete" | "error"; message: string };
const shared = globalThis as typeof globalThis & { butlerSchoolJob?: Job; butlerSchoolCancel?: () => void };
export const schoolJob = () => shared.butlerSchoolJob || null;
export function cancelSchoolDiscovery() { shared.butlerSchoolCancel?.(); return schoolJob(); }
export function workerCommand() {
  const directory = resolve(process.env.BUTLER_LMS_WORKER_DIR || "../../ops/lms-sync");
  const frozen = join(directory, "ButlerSync.exe");
  if (process.platform === "win32" && existsSync(frozen)) return { exe: frozen, prefix: [] as string[], directory };
  const local = join(directory, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const exe = process.env.LMS_PYTHON || (existsSync(local) ? local : process.platform === "win32" ? "python.exe" : "python3");
  const probe = spawnSync(exe, ["-c", "import playwright.async_api"], { windowsHide: true, timeout: 8000, stdio: "ignore" });
  if (probe.error || probe.status !== 0 || !existsSync(join(directory, "lms_sync.py"))) throw new Error(uiText("school.auto.workerMissing"));
  return { exe, prefix: [join(directory, "lms_sync.py")], directory };
}
export async function applyDiscoveredCatalog(profileId: string, canApply = () => true) {
  const settings = readProfiles(), profile = activeProfile(settings);
  if (!profile || profile.id !== profileId) throw new Error(uiText("school.auto.profileChanged"));
  const catalog = await enrichTermLabels(readCatalog(profileId));
  const current = readProfiles();
  if (!canApply()) throw new Error(uiText("school.auto.cancelled"));
  if (current.activeProfileId !== profileId) throw new Error(uiText("school.auto.profileChanged"));
  const next = discoverProfile(profile.entryUrl, current, catalog);
  const saved = saveProfile(next);
  updateLmsFeed(feed => applyProfileMetadata(feed, saved));
  return !!latestSemester(catalog);
}
export function startSchoolDiscovery(login: boolean) {
  if (schoolJob()?.state === "running") throw new Error(uiText("school.auto.busy"));
  const profile = activeProfile(readProfiles());
  if (!profile || !supportsSchoolConnection(profile.domain, profile.platform)) throw new Error(uiText("school.auto.connectionUnsupported"));
  const command = workerCommand();
  const job: Job = { profileId: profile.id, state: "running", message: uiText(login ? "school.auto.signingIn" : "school.auto.reading") };
  shared.butlerSchoolJob = job;
  let stopChild: (() => void) | undefined;
  shared.butlerSchoolCancel = () => { job.state = "error"; job.message = uiText("school.auto.cancelled"); stopChild?.(); };
  const run = (action: "login" | "catalog") => new Promise<void>((ok, fail) => {
    const child = spawn(command.exe, [...command.prefix, "--config", configPath(), "--expected-profile", profile.id, action], { cwd: command.directory, windowsHide: true, stdio: "ignore" });
    stopChild = () => {
      if (child.pid && child.exitCode === null) {
        if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        else child.kill();
      }
    };
    const timer = setTimeout(() => {
      stopChild?.();
      fail(new Error(uiText("school.auto.timeout")));
    }, 720000);
    child.once("error", () => { clearTimeout(timer); fail(new Error(uiText("school.auto.workerMissing"))); });
    child.once("exit", code => { clearTimeout(timer); if (code === 0) ok(); else fail(new Error(uiText("school.auto.loginRequired"))); });
  });
  void (async () => {
    try {
      if (login) await run("login");
      if (job.state !== "running") return;
      job.message = uiText("school.auto.reading"); await run("catalog");
      const found = await applyDiscoveredCatalog(profile.id, () => shared.butlerSchoolJob === job && job.state === "running");
      job.state = "complete"; job.message = uiText(found ? "school.auto.complete" : "school.auto.termUnavailable");
    } catch (error) { if (job.state === "running") { job.state = "error"; job.message = error instanceof Error ? error.message : uiText("school.auto.loginRequired"); } }
  })();
  return job;
}
