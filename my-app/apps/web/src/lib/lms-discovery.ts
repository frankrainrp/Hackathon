import { createHash } from "node:crypto";
import { uiText } from "./messages.ts";
import { schoolEntry, type ProfileInput, type ProfileSettings } from "./lms-profile.ts";

// Recognition does not grant connection permission. Login still uses the exact reviewed host policy.
const schools = [
  { code: "tp", name: "Temasek Polytechnic", domain: "tp.edu.sg", lms: "tplms.polite.edu.sg" },
  { code: "rp", name: "Republic Polytechnic", domain: "rp.edu.sg", lms: "rplms.polite.edu.sg" },
  { code: "sp", name: "Singapore Polytechnic", domain: "sp.edu.sg", lms: "splms.polite.edu.sg" },
  { code: "np", name: "Ngee Ann Polytechnic", domain: "np.edu.sg", lms: "nplms.polite.edu.sg" },
  { code: "nyp", name: "Nanyang Polytechnic", domain: "nyp.edu.sg", lms: "nyplms.polite.edu.sg" },
];
export function identifySchool(entryUrl: string) {
  const entry = schoolEntry(entryUrl);
  const school = schools.find(s => entry.domain === s.lms || entry.domain === s.domain || entry.domain.endsWith("." + s.domain));
  if (!school) throw new Error(uiText("school.auto.unknown"));
  return { ...entry, school: school.name, code: school.code, platform: entry.domain === school.lms ? "brightspace" as const : "unsupported" as const };
}
export interface DiscoveredCourse {
  id: string; name: string; code?: string; startAt?: string | null; endAt?: string | null;
  isActive?: boolean; canAccess?: boolean; semester?: { id: string; name: string } | null;
}
const stableId = (prefix: string, value: string) => prefix + createHash("sha256").update(value).digest("hex").slice(0, 20);
function termFromCourse(c: DiscoveredCourse) {
  // RP enrollment codes carry the actual term even when student roles cannot read offering metadata.
  const encoded = c.code?.match(/^(\d{2})S([12])(?:-|$)/i);
  const name = c.semester?.name || (encoded ? `${encoded[1]}S${encoded[2]}` : undefined)
    || (`${c.name} ${c.code || ""}`.match(/(?:AY\s*)?20\d{2}\s*[/\-]\s*(?:20)?\d{2}\s*(?:Semester|Sem|Term)\s*[1-4]/i)?.[0]);
  if (!name?.trim()) return null;
  const date = c.startAt ? Date.parse(c.startAt) : NaN;
  const parts = name.match(/(20\d{2}).*?(?:Semester|Sem|Term)\s*([1-4])/i) || name.match(/^(\d{2})S([12])$/i);
  const year = parts ? Number(parts[1]) + (parts[1].length === 2 ? 2000 : 0) : 0;
  return { id: stableId("term-", c.semester?.id || name.trim().toLowerCase()), label: name.trim().slice(0, 160),
    start: Number.isFinite(date) ? date : null, rank: parts ? year * 10 + Number(parts[2]) : 0 };
}
export const hasSemesterEvidence = (course: DiscoveredCourse) => !!termFromCourse(course);
export function latestSemester(catalog: DiscoveredCourse[], now = Date.now()) {
  const candidates = catalog.filter(c => /^[a-zA-Z0-9_-]{1,100}$/.test(c.id) && c.name?.trim() && c.isActive !== false && c.canAccess !== false)
    .map(c => ({ course: c, term: termFromCourse(c) }))
    .filter((x): x is { course: DiscoveredCourse; term: NonNullable<ReturnType<typeof termFromCourse>> } => !!x.term && (x.term.start === null || x.term.start <= now));
  if (!candidates.length) return null;
  const terms = new Map<string, typeof candidates[number]["term"]>();
  for (const { term } of candidates) {
    const old = terms.get(term.id);
    if (!old || (term.start ?? 0) > (old.start ?? 0)) terms.set(term.id, term);
  }
  const ordered = Array.from(terms.values()).sort((a, b) => (b.start ?? 0) - (a.start ?? 0) || b.rank - a.rank);
  const latest = ordered[0];
  // Unordered unnamed-date semesters cannot be safely ranked by opaque ID or API order.
  if (ordered.length > 1 && latest.start === null && (!latest.rank || ordered[1].rank === latest.rank)) return null;
  return { id: latest.id, label: latest.label, confirmed: true,
    courses: Array.from(new Map(candidates.filter(x => x.term.id === latest.id).map(({ course }) => [course.id, { id: course.id, name: course.name.trim().slice(0, 500), selected: true, status: "active" as const }])).values()) };
}
export function discoverProfile(entryUrl: string, settings: ProfileSettings, catalog: DiscoveredCourse[], now = Date.now()): ProfileInput {
  const identity = identifySchool(entryUrl), existing = settings.profiles.find(p => p.origin === identity.origin);
  const found = latestSemester(catalog, now);
  const retained = found && existing?.semesters.find(s => s.id === found.id || s.label === found.label);
  const semester = found ? { ...found, id: retained?.id || found.id, courses: found.courses.map(c => ({ ...c, ...retained?.courses.find(old => old.id === c.id), name: c.name })).concat(retained?.courses.filter(c => !found.courses.some(next => next.id === c.id)) || []) }
    : existing?.semesters.find(s => s.id === existing.activeSemesterId) || { id: "pending-" + identity.code, label: uiText("school.auto.pendingTerm"), confirmed: false, courses: [] };
  return { id: existing?.id || stableId("school-", identity.origin), school: existing?.school || identity.school, entryUrl: identity.entryUrl, platform: identity.platform, autoDiscover: true,
    semester, daily: existing?.daily || { time: "09:00", timezone: "Asia/Singapore" } };
}
