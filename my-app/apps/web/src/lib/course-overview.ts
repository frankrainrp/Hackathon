import type { LmsCourse } from "./lms-sync.ts";
import type { ProfileSettings } from "./lms-profile.ts";

export type OverviewCourse = LmsCourse & { catalogOnly?: boolean };

/** List authenticated enrollments before download, matching their full school/term scope. */
export function overviewCourses(imported: LmsCourse[], settings: ProfileSettings): OverviewCourse[] {
  const courses: OverviewCourse[] = [...imported];
  const profile = settings.profiles.find(p => p.id === settings.activeProfileId);
  const semester = profile?.semesters.find(s => s.id === profile.activeSemesterId && s.confirmed);
  if (!profile || !semester) return courses;
  for (const enrollment of semester.courses) {
    const index = courses.findIndex(c => c.profileId === profile.id && c.semesterId === semester.id && c.id === enrollment.id);
    if (index >= 0) {
      courses[index] = { ...courses[index], moduleName: enrollment.name, school: profile.school,
        semesterLabel: semester.label, courseStatus: enrollment.status, archived: false };
    } else {
      courses.push({ id: enrollment.id, moduleName: enrollment.name, school: profile.school,
        profileId: profile.id, semesterId: semester.id, semesterLabel: semester.label,
        courseStatus: enrollment.status, archived: false, catalogOnly: true,
        noteId: `catalog-${profile.id}-${semester.id}-${enrollment.id}`,
        lessons: [], assignments: [], announcements: [] });
    }
  }
  return courses;
}
