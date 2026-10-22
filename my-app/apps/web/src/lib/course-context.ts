import type { LmsCourse, LmsFeed } from "./lms-sync";

export interface CourseSource { label: string; url: string; excerpt: string; truncated: boolean }
export interface CourseContext { courses: string[]; sources: CourseSource[]; metadata: string; missingText: number }
function tokens(value: string): string[] {
  const lowered = value.toLowerCase();
  return Array.from(new Set([...(lowered.match(/[a-z0-9]{2,}/g) || []), ...(lowered.match(/[\u4e00-\u9fff]+/g) || []).flatMap(run => Array.from({ length: Math.max(0, run.length - 1) }, (_, i) => run.slice(i, i + 2)))] )).slice(0, 100);
}

export function matchesCourse(course: LmsCourse, query: string) {
  const normalized = query.toLowerCase();
  const name = course.moduleName.toLowerCase();
  const code = name.match(/\b[a-z]\d{3,}\b/)?.[0];
  const title = name.replace(/^\s*[a-z]\d{3,}\s*/, "").trim();
  return !!(code && new RegExp(`\\b${code}\\b`, "i").test(query))
    || normalized.includes(name) || (title.length >= 6 && normalized.includes(title));
}
export function wantsCourseContext(feed: LmsFeed, query: string, noteId?: string) {
  return !!noteId || /课程|课件|课堂|\b(lesson|module|course|materials?)\b/i.test(query)
    || (feed.courses || []).some(c => !c.archived && matchesCourse(c, query));
}

/** Sources are supplied by the app even when the model emits plain text titles. */
export function sourceLinksMarkdown(context: CourseContext, language: "en" | "zh" = "en") {
  const unique = Array.from(new Map(context.sources.map(s => [s.url, s])).values());
  const links = unique.filter(s => { try { return new URL(s.url).protocol === "https:"; } catch { return false; } })
    .map(s => `- [${s.label.replace(/[\\[\]]/g, "\\$&").replace(/[\r\n]/g, " ")}](${s.url.replace(/\(/g, "%28").replace(/\)/g, "%29")})`);
  return links.length ? `\n\n**${language === "zh" ? "课程资料来源" : "Course sources"}**\n${links.join("\n")}` : "";
}

/** Server reads verified stored data, never client-provided paths or course text. */
export function selectCourseContext(feed: LmsFeed, query: string, noteId?: string): CourseContext {
  const selected = noteId ? (feed.courses || []).filter(c => c.noteId === noteId) : (feed.courses || []).filter(c => !c.archived);
  const terms = tokens(query);
  const explicit = selected.filter(c => matchesCourse(c, query));
  const courses: LmsCourse[] = !noteId && explicit.length ? explicit : selected;
  const candidates: (CourseSource & { score: number })[] = [];
  let missingText = 0;
  for (const course of courses) for (const lesson of course.lessons) for (const material of lesson.materials) {
    if (!material.text?.trim()) { missingText++; continue; }
    for (let offset = 0; offset < material.text.length; offset += 1000) {
      const excerpt = material.text.slice(offset, offset + 1400);
      const haystack = `${course.moduleName} ${lesson.title} ${material.title} ${excerpt}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      candidates.push({ label: `${course.moduleName} / ${lesson.number === null ? "Resources" : `${lesson.kind ?? "Lesson"} ${lesson.number}`} / ${material.title}`,
        url: material.url, excerpt, score, truncated: material.textStatus === "truncated" });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const sources = candidates.slice(0, 8).map(({ score: _score, ...source }) => source);
  const metadata = courses.slice(0, 12).map(c => `${c.moduleName}: ${c.lessons.length} lesson groups; ${c.assignments.length} assignments. ` +
    c.assignments.slice(0, 8).map(a => `${a.title}: ${a.submissionState}; due=${a.dueAt || "not published"}`).join("; ")).join("\n").slice(0, 5000);
  return { courses: courses.map(c => c.moduleName), sources, metadata, missingText };
}
export function courseContextPrompt(context: CourseContext) {
  return JSON.stringify({ type: "untrusted_course_reference", ...context });
}
