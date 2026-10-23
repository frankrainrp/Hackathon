import { openSync, closeSync, readSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";
import type { LmsCourse } from "./lms-sync.ts";

export type MaterialSelector = { profile: string; semester: string; course: string; material: string };
const inside = (root: string, file: string) => { const part = relative(root, file); return !!part && !part.startsWith("..") && !isAbsolute(part); };

/** Only files already registered to the exact school/semester/course can be served. */
export function registeredMaterialFile(root: string, courses: LmsCourse[], selector: MaterialSelector) {
  const course = courses.find(c => c.profileId === selector.profile && c.semesterId === selector.semester && c.id === selector.course);
  const material = course?.lessons.flatMap(l => l.materials).find(m => m.id === selector.material);
  if (!material?.filePath || !isAbsolute(material.filePath)) return null;
  const target = resolve(material.filePath), base = resolve(root);
  if (!inside(base, target)) return null;
  try {
    const path = realpathSync(target), actualRoot = realpathSync(base);
    if (!inside(actualRoot, path)) return null;
    const stat = statSync(path);
    if (!stat.isFile()) return null;
    let pdf = false;
    if (/\.pdf$/i.test(path)) {
      const file = openSync(path, "r"), header = Buffer.alloc(5);
      try { pdf = readSync(file, header, 0, 5, 0) === 5 && header.toString("ascii") === "%PDF-"; }
      finally { closeSync(file); }
    }
    let video = false;
    if (/\.mp4$/i.test(path)) {
      const file = openSync(path, "r"), header = Buffer.alloc(12);
      try { video = readSync(file, header, 0, 12, 0) === 12 && header.toString("ascii", 4, 8) === "ftyp"; }
      finally { closeSync(file); }
    }
    return { path, name: basename(path), size: stat.size, pdf, video };
  } catch { return null; }
}

export function materialByteRange(header: string | null, size: number) {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return null;
  return { start, end, partial: true };
}
