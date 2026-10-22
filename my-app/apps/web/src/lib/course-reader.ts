import type { LmsCourse } from "./lms-sync.ts";

export type CourseLesson = LmsCourse["lessons"][number];
export type CourseMaterial = CourseLesson["materials"][number];

/** Week folders that wrap actual lessons belong with supporting resources, not the lesson count. */
export function readerSections(lessons: CourseLesson[]) {
  const hasLessons = lessons.some(l => l.number !== null && l.kind !== "Week");
  const primary = lessons.filter(l => l.number !== null && (!hasLessons || l.kind !== "Week"));
  return { primary, supporting: lessons.filter(l => !primary.includes(l)) };
}

export function compactSourceTitle(title: string) {
  const compact = title.replaceAll("_", " ").replace(/^[A-Z]\d{3,}\s*[-–:]?\s*/i, "")
    .replace(/\b(?:week|wk|lesson|lecture|session|L)\s*0*\d+(?:\s*[-–]\s*\d+)?\b/gi, "")
    .replace(/^[\s\-–:·]+|[\s\-–:·]+$/g, "").replace(/\s+/g, " ").trim();
  return compact;
}

export function materialIsPdf(material: CourseMaterial) { return /\.pdf$/i.test(material.filePath || ""); }
export function firstReadingMaterial(materials: CourseMaterial[]) {
  return materials.find(materialIsPdf) || materials.find(m => m.text?.trim()) || materials[0];
}

export function materialFileUrl(course: LmsCourse, material: CourseMaterial) {
  if (!course.profileId || !course.semesterId || !material.filePath) return null;
  return "/api/lms/material?" + new URLSearchParams({ profile: course.profileId, semester: course.semesterId, course: course.id, material: material.id });
}
