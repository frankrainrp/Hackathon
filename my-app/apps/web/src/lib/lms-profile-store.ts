import { uiText } from "./messages.ts";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { confirmProfile, emptyProfiles, type ProfileSettings } from "./lms-profile.ts";
import { identifySchool } from "./lms-discovery.ts";

export const configPath = () => process.env.LMS_CONFIG_PATH || resolve(process.cwd(), "../../ops/lms-sync/config.local.json");
export function readProfiles(path = configPath()): ProfileSettings {
  if (!existsSync(path)) return emptyProfiles();
  const config = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  const settings = config.profileSettings || emptyProfiles();
  return { ...settings, profiles: settings.profiles.map(p => ({ ...p, platform: p.platform || identifySchool(p.entryUrl).platform })) } as ProfileSettings;
}
export function saveProfile(raw: unknown, path = configPath()) {
  const config = existsSync(path) ? JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) : {};
  const settings = confirmProfile(readProfiles(path), raw);
  mkdirSync(dirname(path), { recursive: true });
  const content = { ...config, profileSettings: settings, output_dir: config.output_dir || "courses", private_dir: config.private_dir || ".private", butler_url: process.env.BUTLER_APP_URL || config.butler_url || "http://127.0.0.1:3000", max_file_mb: config.max_file_mb || 150 };
  if (existsSync(path)) copyFileSync(path, path + ".bak");
  const stored = { ...content, profileSettings: { ...settings, profiles: settings.profiles.map(p => {
    if (!p.autoDiscover) return p;
    const { platform: _derived, ...fields } = p; return fields;
  }) } };
  writeFileSync(path + ".tmp", JSON.stringify(stored, null, 2) + "\n", { mode: 0o600 });
  renameSync(path + ".tmp", path);
  return settings;
}

const blocked = new BlockList();
for (const [ip, prefix] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3]] as const) blocked.addSubnet(ip, prefix, "ipv4");
for (const [ip, prefix] of [["::", 96], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32]] as const) blocked.addSubnet(ip, prefix, "ipv6");
export async function requirePublicHost(host: string, resolveHost = lookup) {
  const addresses = await resolveHost(host, { all: true });
  if (!addresses.length || addresses.some(({ address, family }) => !isIP(address) || blocked.check(address, family === 6 ? "ipv6" : "ipv4"))) throw new Error(uiText("server.5aa54a6ce3be"));
}

export function readCatalog(profileId: string, path = configPath()) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(profileId)) return [];
  const config = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  const file = resolve(dirname(path), config.private_dir || ".private", "catalogs", profileId + ".json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}
