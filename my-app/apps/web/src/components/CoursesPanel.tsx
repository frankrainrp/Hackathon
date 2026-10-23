"use client";
import { uiText, stateLabel } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";


import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, FileText, Search } from "lucide-react";
import type { LmsCourse, LmsFeed } from "@/lib/lms-sync";
import type { Note } from "@/lib/types";
import styles from "./CoursesPanel.module.css";
import { useT } from "@/lib/i18n";
import { courseCopy } from "@/lib/course-copy";
import { activeProfile, type ProfileSettings } from "@/lib/lms-profile";
import { overviewCourses, type OverviewCourse } from "@/lib/course-overview";
import CourseReader from "./CourseReader";
import { assignmentAvailability, readerSections } from "@/lib/course-reader";

interface Props {
  feed: LmsFeed | null;
  profiles: ProfileSettings;
  onOpenSettings: () => void;
  notes: Note[];
  onToggleLesson: (noteId: string, lessonId: string) => void;
  onOpenNote: (noteId: string) => void;
  onAskCourse: (course: LmsCourse) => void;
}

type Row = { course: OverviewCourse; total: number; submitted: number; unknown: number; missing: number; upcoming: number };

function Track({ value, total, unknown = 0, missing = 0, label }: { value: number; total: number; unknown?: number; missing?: number; label: string }) {
  const uiLanguage = useCopyLanguage().lang;
  const { lang } = useT();
  const c = courseCopy[lang];
  const pct = total ? Math.round(value / total * 100) : 0;
  return <div className={styles.track} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total || 100} aria-valuenow={value} aria-valuetext={total ? `${value} ${c.submitted} · ${missing} ${c.missing} · ${unknown} ${c.unknown}` : c.noData}>
    <span className={styles.fill} style={{ width: `${pct}%` }} />
    {!!missing && <span className={styles.missing} style={{ width: `${missing / total * 100}%` }} />}
    {!!unknown && <span className={styles.uncertain} style={{ width: `${unknown / total * 100}%` }} />}
  </div>;
}

export default function CoursesPanel({ feed, profiles, notes, onOpenSettings, onToggleLesson, onOpenNote, onAskCourse }: Props) {
  const uiLanguage = useCopyLanguage().lang;
  const { lang } = useT();
  const c = courseCopy[lang];
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [recordView, setRecordView] = useState("current");
  const discovered = useMemo(() => overviewCourses(feed?.courses || [], profiles), [feed, profiles]);
  const profile = activeProfile(profiles);
  const semester = profile?.semesters.find(s => s.id === profile.activeSemesterId);
  const rows: Row[] = useMemo(() => discovered.map(course => ({ course, total: course.assignments.length,
    submitted: course.assignments.filter(a => a.submissionState === "submitted").length,
    unknown: course.assignments.filter(a => a.submissionState === "unknown").length,
    missing: course.assignments.filter(a => a.submissionState === "missing").length,
    upcoming: course.assignments.filter(a => assignmentAvailability(a) === "upcoming").length,
  })), [discovered]);
  const filtered = rows.filter(r => (recordView === "all" || (recordView === "history" ? (r.course.archived || !r.course.semesterId) : (r.course.semesterId && !r.course.archived))) && `${r.course.moduleName} ${r.course.school}`.toLowerCase().includes(query.trim().toLowerCase()));
  const totals = filtered.reduce((s, r) => ({ total: s.total + r.total, submitted: s.submitted + r.submitted, unknown: s.unknown + r.unknown - r.upcoming, upcoming: s.upcoming + r.upcoming }), { total: 0, submitted: 0, unknown: 0, upcoming: 0 });
  const syncedAt = feed?.status?.syncedAt;

  return <section className={styles.panel} aria-label={c.title}>
    <header className={styles.header}>
      <div><h1>{c.title}</h1><p>{profile ? `${profile.school} · ${semester?.confirmed ? semester.label : uiText("school.auto.pendingTerm")}` : c.intro}</p></div>
      <div className={styles.sync}>{syncedAt ? `${c.lastSync} ${new Date(syncedAt).toLocaleString(lang === "en" ? "en-GB" : "zh-CN", { timeZone: "Asia/Singapore", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : c.waiting}<button className={styles.settingsLink} onClick={onOpenSettings}>{uiText("course.schoolSettings")}</button></div>
    </header>

    <label className={styles.recordView}>{lang === "zh" ? uiText("ui.coursespanel.d575c9f5ee") : uiText("ui.coursespanel.189795a882")}<select value={recordView} onChange={e => setRecordView(e.target.value)}><option value="current">{lang === "zh" ? uiText("ui.coursespanel.42d6be3dd0") : uiText("ui.coursespanel.a139a24717")}</option><option value="history">{lang === "zh" ? uiText("ui.coursespanel.396cda143a") : uiText("ui.coursespanel.c61b937507")}</option><option value="all">{lang === "zh" ? uiText("ui.coursespanel.a63b6b827c") : uiText("ui.coursespanel.7cedd970fd")}</option></select></label>

    {feed?.status && feed.status.status !== "ok" && <div className={styles.notice}><div><strong>{feed.status.status === "login_required" ? c.expired : c.partial}</strong><p>{c.retry}</p></div></div>}

    <div className={styles.toolbar}><div className={styles.summary}><strong>{filtered.length} {c.courses}</strong><span>{totals.submitted} / {totals.total} {c.assignmentsDone}</span>{!!totals.unknown && <span>{totals.unknown} {c.unknownItems}</span>}{!!totals.upcoming && <span>{uiText("reader.upcomingCount", { count: totals.upcoming })}</span>}</div><label className={styles.search}><Search size={16} /><input aria-label={c.search} placeholder={c.searchPlaceholder} value={query} onChange={e => setQuery(e.target.value)} /></label></div>

    <div className={styles.legend}><span><i className={styles.doneDot} />{c.submitted}</span><span><i className={styles.unknownDot} />{c.unknown}</span><span><i className={styles.todoDot} />{c.missing}</span></div>
    <div className={styles.list}>
      {filtered.map(({ course, total, submitted, unknown, missing, upcoming }) => {
        const code = course.moduleName.match(/^[A-Z]\d+/)?.[0] || uiText("course.module");
        const name = course.moduleName.replace(/^[A-Z]\d+\s*/, "");
        const open = expanded === course.noteId;
        const lessons = readerSections(course.lessons).primary;
        const completedIds = new Set(notes.find(n => n.id === course.noteId)?.lmsCompletedLessons || []);
        const learned = lessons.filter(l => completedIds.has(l.id)).length;
        return <article key={course.noteId} className={styles.row}>
          <button className={styles.rowButton} aria-expanded={open} aria-controls={`course-${course.noteId}`} onClick={() => setExpanded(open ? null : course.noteId)}>
            <div className={styles.code}>{code}</div>
            <div className={styles.content}><div className={styles.title}><h2>{name}</h2><span>{course.school}</span></div><p className={styles.emptyDetail}>{`${course.semesterLabel || (lang === "zh" ? uiText("ui.coursespanel.9fa5908b31") : uiText("ui.coursespanel.1aa799f77b"))} · ${course.archived ? (lang === "zh" ? uiText("ui.coursespanel.d1f810edb8") : uiText("ui.coursespanel.183a8dfcff")) : (lang === "zh" ? uiText("ui.coursespanel.42d6be3dd0") : uiText("ui.coursespanel.a139a24717"))} · ${stateLabel(course.courseStatus || "active")}`}</p>
              {course.catalogOnly ? <p className={styles.emptyDetail}>{uiText("course.catalogOnly")}</p> : <><div className={styles.progressLabel}><span>{c.submission}</span><span>{total ? `${submitted} / ${total} ${c.submitted}${unknown - upcoming ? ` · ${unknown - upcoming} ${c.unknown}` : ""}${upcoming ? ` · ${uiText("reader.upcomingCount", { count: upcoming })}` : ""}${missing ? ` · ${missing} ${c.missing}` : ""}` : c.noAssignments}</span></div>
              <Track value={submitted} total={total} unknown={unknown} missing={missing} label={`${course.moduleName} ${c.submission}`} /></>}
              {!!lessons.length && <div className={styles.progressLabel}><span>{c.learning}</span><span>{learned} / {lessons.length} {c.learned}</span></div>}
            </div>
            <div className={styles.percent}>{total ? `${Math.round(submitted / total * 100)}%` : "—"}<ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : undefined }} /></div>
          </button>
          {open && <div id={`course-${course.noteId}`} className={styles.details}>
            <div className={styles.detailHeader}><h3>{uiText("reader.title")}</h3><div className={styles.actions}>{course.catalogOnly ? <button onClick={onOpenSettings}>{uiText("course.schoolSettings")}</button> : <><button onClick={() => onAskCourse(course)}>{c.ask}</button><button onClick={() => onOpenNote(course.noteId)}><FileText size={15} />{c.notes}</button></>}</div></div>
            {course.catalogOnly ? <p className={styles.emptyDetail}>{uiText("course.downloadNeeded")}</p> : <CourseReader key={course.noteId} course={course} completed={completedIds} onToggleLesson={onToggleLesson} onOpenSettings={onOpenSettings} />}
          </div>}
        </article>;
      })}
      {!filtered.length && <div className={styles.empty}><BookOpen size={32} /><h2>{rows.length ? c.notFound : c.empty}</h2><p>{rows.length ? c.searchTip : c.loginTip}</p>{!rows.length && <div className={styles.emptyActions}><button onClick={onOpenSettings}>{uiText("course.schoolSettings")}</button></div>}</div>}
    </div>
    <footer className={styles.footer}>{c.footer}</footer>
  </section>;
}
