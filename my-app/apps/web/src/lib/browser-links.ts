import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { requirePublicHost } from "./lms-profile-store.ts";
import { uiText } from "./messages.ts";

export function browserLink(value: unknown) {
  if (typeof value !== "string" || value.length > 3000 || /[\\\x00-\x20]/.test(value)) throw new Error(uiText("links.invalid"));
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443"
    || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname)
    || /\.(?:localhost|local|internal|test|invalid|home|lan)$/i.test(url.hostname)) throw new Error(uiText("links.invalid"));
  return url;
}
export async function openInEdge(value: unknown, options: {
  platform?: string; roots?: string[]; exists?: typeof existsSync; launch?: typeof spawn;
  publicHost?: typeof requirePublicHost;
} = {}) {
  const url = browserLink(value);
  await (options.publicHost || requirePublicHost)(url.hostname);
  if ((options.platform || process.platform) !== "win32") throw new Error(uiText("links.edgeMissing"));
  const roots = options.roots || [process.env["ProgramFiles(x86)"], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter((p): p is string => !!p);
  const edge = roots.filter(isAbsolute).map(root => join(root, "Microsoft/Edge/Application/msedge.exe")).find(options.exists || existsSync);
  if (!edge) throw new Error(uiText("links.edgeMissing"));
  const child = (options.launch || spawn)(edge, [url.href], { shell: false, detached: true, windowsHide: false, stdio: "ignore" });
  await new Promise<void>((ok, fail) => { child.once("spawn", ok); child.once("error", () => fail(new Error(uiText("links.failed")))); });
  child.unref();
}
