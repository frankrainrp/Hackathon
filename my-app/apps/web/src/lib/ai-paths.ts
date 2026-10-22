// Server-only, evaluated at runtime so moving an installation never freezes a build-machine path.
import { platform } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { uiText } from "./messages.ts";

export function defaultModelsDirectory() {
  const configured = process.env.BUTLER_MODELS_DIR?.trim();
  if (configured) {
    if (!isAbsolute(configured) || /^(\\\\|\/\/)/.test(configured) || configured.includes("\0")) throw new Error(uiText("ai.folder.absoluteEnv"));
    return resolve(configured);
  }
  // Environment-derived paths remain runtime-only. A build must never trace a developer's home.
  const home = process.env.USERPROFILE || process.env.HOME || resolve(process.cwd(), ".private");
  const local = platform() === "win32" ? process.env.LOCALAPPDATA || join(home, "AppData", "Local")
    : platform() === "darwin" ? join(home, "Library", "Application Support")
    : process.env.XDG_DATA_HOME || join(home, ".local", "share");
  return resolve(local, "Butler", "models");
}
