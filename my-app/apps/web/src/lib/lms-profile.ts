import { uiText } from "./messages.ts";
import { z } from "zod";

const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
// Only reviewed institution hosts may be contacted. Other public URLs are metadata only.
export function supportsSchoolConnection(domain: string, platform: string) {
  return platform === "brightspace" && ["tplms.polite.edu.sg", "rplms.polite.edu.sg", "splms.polite.edu.sg"].includes(domain);
}
export function schoolEntry(value: string) {
  if (/[\\\s\x00-\x1f]/.test(value.trim()) || /^https:\/\/[^/]*@/i.test(value.trim())) throw new Error(uiText("server.6ce73397d1d2"));
  const url = new URL(value.trim());
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || (url.port && url.port !== "443")) throw new Error(uiText("server.2b9c33109d09"));
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host) || /\.(?:localhost|local|internal|test|invalid|home|lan)$/.test(host)) throw new Error(uiText("server.f996d830ecdd"));
  return { entryUrl: url.href, origin: url.origin, domain: host };
}

const course = z.object({ id: identifier, name: z.string().trim().min(1).max(500), selected: z.boolean(), status: z.enum(["active", "completed", "paused"]) }).strict();
const semester = z.object({ id: identifier, label: z.string().trim().min(1).max(160), confirmed: z.boolean(), courses: z.array(course).max(100) }).strict();
export const profileInput = z.object({
  id: identifier, school: z.string().trim().min(1).max(160), entryUrl: z.string().max(2000),
  platform: z.enum(["brightspace", "unsupported"]),
  semester, daily: z.object({ time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), timezone: z.enum(["Asia/Singapore", "UTC"]) }).strict(),
  autoDiscover: z.boolean().optional(),
}).strict();
export interface ProfileInput {
  id: string; school: string; entryUrl: string; platform: "brightspace" | "unsupported";
  semester: { id: string; label: string; confirmed: boolean; courses: { id: string; name: string; selected: boolean; status: "active" | "completed" | "paused" }[] };
  daily: { time: string; timezone: "Asia/Singapore" | "UTC" };
  autoDiscover?: boolean;
}
export type SchoolProfile = Omit<ProfileInput, "semester"> & { origin: string; domain: string; confirmedAt: string; semesters: ProfileInput["semester"][]; activeSemesterId: string };
export interface ProfileSettings { version: 1; activeProfileId: string | null; profiles: SchoolProfile[] }
export const emptyProfiles = (): ProfileSettings => ({ version: 1, activeProfileId: null, profiles: [] });
export function previewProfile(raw: unknown) {
  const input = profileInput.parse(raw) as ProfileInput;
  if (new Set(input.semester.courses.map(c => c.id)).size !== input.semester.courses.length) throw new Error(uiText("server.9494ad775a30"));
  return { ...input, ...schoolEntry(input.entryUrl) };
}
export function confirmProfile(settings: ProfileSettings, raw: unknown, now = new Date().toISOString()): ProfileSettings {
  const input = previewProfile(raw);
  const old = settings.profiles.find(p => p.id === input.id);
  if (old && (old.origin !== input.origin || old.school !== input.school)) throw new Error(uiText("server.c493436e31d2"));
  const { semester: nextSemester, ...fields } = input;
  const semesters = (old?.semesters || []).filter(s => s.id !== nextSemester.id).concat(nextSemester);
  const profile = { ...fields, confirmedAt: now, semesters, activeSemesterId: nextSemester.id };
  return { version: 1, activeProfileId: profile.id, profiles: settings.profiles.filter(p => p.id !== profile.id).concat(profile) };
}
export function activeProfile(settings: ProfileSettings) { return settings.profiles.find(p => p.id === settings.activeProfileId); }
