"use client";
import { uiText, stateLabel } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";


import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, FileText, Search } from "lucide-react";
import type { LmsCourse, LmsFeed } from "@/lib/lms-sync";
import type { Note } from "@/lib/types";
import styles from "./CoursesPanel.module.css";
import { useT } from "@/lib/i18n";
import { courseCopy } from "@/lib/course-copy";
import { demoCourses } from "@/lib/course-demo";
import { activeProfile, type ProfileSettings } from "@/lib/lms-profile";
import { overviewCourses, type OverviewCourse } from "@/lib/course-overview";
import SourceLink from "./SourceLink";

interface Props {
  feed: LmsFeed | null;
  profiles: ProfileSettings;
  onOpenSettings: () => void;
  notes: Note[];
  onToggleLesson: (noteId: string, lessonId: string) => void;
  onOpenNote: (noteId: string) => void;
  onAskCourse: (course: LmsCourse) => void;
}

type Row = { course: OverviewCourse; total: number; submitted: number; unknown: number; missing: number };

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
  const [showPreview, setShowPreview] = useState(false);
  const [recordView, setRecordView] = useState("current");
  const discovered = useMemo(() => overviewCourses(feed?.courses || [], profiles), [feed, profiles]);
  const profile = activeProfile(profiles);
  const semester = profile?.semesters.find(s => s.id === profile.activeSemesterId);
  const historical = !discovered.length && showPreview;
  const rows: Row[] = useMemo(() => (historical ? demoCourses() : discovered).map(course => ({ course, total: course.assignments.length,
    submitted: course.assignments.filter(a => a.submissionState === "submitted").length,
    unknown: course.assignments.filter(a => a.submissionState === "unknown").length,
    missing: course.assignments.filter(a => a.submissionState === "missing").length,
  })), [discovered, historical, uiLanguage]);
  const filtered = rows.filter(r => (historical || recordView === "all" || (recordView === "history" ? (r.course.archived || !r.course.semesterId) : (r.course.semesterId && !r.course.archived))) && `${r.course.moduleName} ${r.course.school}`.toLowerCase().includes(query.trim().toLowerCase()));
  const totals = filtered.reduce((s, r) => ({ total: s.total + r.total, submitted: s.submitted + r.submitted, unknown: s.unknown + r.unknown }), { total: 0, submitted: 0, unknown: 0 });
  const syncedAt = feed?.status?.syncedAt;

  return <section className={styles.panel} aria-label={c.title}>
    <header className={styles.header}>
      <div><h1>{c.title}</h1><p>{!historical && profile ? `${profile.school} · ${semester?.confirmed ? semester.label : uiText("school.auto.pendingTerm")}` : c.intro}</p></div>
      <div className={styles.sync}>{historical ? c.demoDate : syncedAt ? `${c.lastSync} ${new Date(syncedAt).toLocaleString(lang === "en" ? "en-GB" : "zh-CN", { timeZone: "Asia/Singapore", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : c.waiting}<button className={styles.settingsLink} onClick={onOpenSettings}>{uiText("course.schoolSettings")}</button></div>
    </header>

    {!historical && <label className={styles.recordView}>{lang === "zh" ? uiText("ui.coursespanel.d575c9f5ee") : uiText("ui.coursespanel.189795a882")}<select value={recordView} onChange={e => setRecordView(e.target.value)}><option value="current">{lang === "zh" ? uiText("ui.coursespanel.42d6be3dd0") : uiText("ui.coursespanel.a139a24717")}</option><option value="history">{lang === "zh" ? uiText("ui.coursespanel.396cda143a") : uiText("ui.coursespanel.c61b937507")}</option><option value="all">{lang === "zh" ? uiText("ui.coursespanel.a63b6b827c") : uiText("ui.coursespanel.7cedd970fd")}</option></select></label>}

    {historical && <div className={styles.notice}><BookOpen size={18} /><div><strong>{c.demoTitle}</strong><p>{c.demoBody}</p></div><button onClick={() => setShowPreview(false)}>{c.exit}</button></div>}
    {!historical && feed?.status && feed.status.status !== "ok" && <div className={styles.notice}><div><strong>{feed.status.status === "login_required" ? c.expired : c.partial}</strong><p>{c.retry}</p></div></div>}

    <div className={styles.toolbar}><div className={styles.summary}><strong>{filtered.length} {c.courses}</strong><span>{totals.submitted} / {totals.total} {c.assignmentsDone}</span>{!!totals.unknown && <span>{totals.unknown} {c.unknownItems}</span>}</div><label className={styles.search}><Search size={16} /><input aria-label={c.search} placeholder={c.searchPlaceholder} value={query} onChange={e => setQuery(e.target.value)} /></label></div>

    <div className={styles.legend}><span><i className={styles.doneDot} />{c.submitted}</span><span><i className={styles.unknownDot} />{c.unknown}</span><span><i className={styles.todoDot} />{c.missing}</span></div>
    <div className={styles.list}>
      {filtered.map(({ course, total, submitted, unknown, missing }) => {
        const code = course.moduleName.match(/^[A-Z]\d+/)?.[0] || uiText("course.module");
        const name = course.moduleName.replace(/^[A-Z]\d+\s*/, "");
        const open = expanded === course.noteId;
        const lessons = course.lessons.filter(l => l.number !== null);
        const completedIds = new Set(notes.find(n => n.id === course.noteId)?.lmsCompletedLessons || []);
        const learned = lessons.filter(l => completedIds.has(l.id)).length;
        return <article key={course.noteId} className={styles.row}>
          <button className={styles.rowButton} aria-expanded={open} aria-controls={`course-${course.noteId}`} onClick={() => setExpanded(open ? null : course.noteId)}>
            <div className={styles.code}>{code}</div>
            <div className={styles.content}><div className={styles.title}><h2>{name}</h2><span>{course.school}</span></div><p className={styles.emptyDetail}>{historical ? c.demoTitle : `${course.semesterLabel || (lang === "zh" ? uiText("ui.coursespanel.9fa5908b31") : uiText("ui.coursespanel.1aa799f77b"))} · ${course.archived ? (lang === "zh" ? uiText("ui.coursespanel.d1f810edb8") : uiText("ui.coursespanel.183a8dfcff")) : (lang === "zh" ? uiText("ui.coursespanel.42d6be3dd0") : uiText("ui.coursespanel.a139a24717"))} · ${stateLabel(course.courseStatus || "active")}`}</p>
              {course.catalogOnly ? <p className={styles.emptyDetail}>{uiText("course.catalogOnly")}</p> : <><div className={styles.progressLabel}><span>{c.submission}</span><span>{total ? `${submitted} / ${total} ${c.submitted}${unknown ? ` · ${unknown} ${c.unknown}` : ""}${missing ? ` · ${missing} ${c.missing}` : ""}` : c.noAssignments}</span></div>
              <Track value={submitted} total={total} unknown={unknown} missing={missing} label={`${course.moduleName} ${c.submission}`} /></>}
              {!!lessons.length && <div className={styles.progressLabel}><span>{c.learning}</span><span>{learned} / {lessons.length} {c.learned}</span></div>}
            </div>
            <div className={styles.percent}>{total ? `${Math.round(submitted / total * 100)}%` : "—"}<ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : undefined }} /></div>
          </button>
          {open && <div id={`course-${course.noteId}`} className={styles.details}>
            <div className={styles.detailHeader}><h3>{c.materials}</h3><div className={styles.actions}>{course.catalogOnly ? <button onClick={onOpenSettings}>{uiText("course.schoolSettings")}</button> : <><button onClick={() => onAskCourse(course)}>{c.ask}</button>{!historical && <button onClick={() => onOpenNote(course.noteId)}><FileText size={15} />{c.notes}</button>}</>}</div></div>
            {!course.catalogOnly && <p className={styles.emptyDetail}>{course.lessons.flatMap(l => l.materials).filter(m => m.text?.trim()).length} {c.readable} · {course.lessons.flatMap(l => l.materials).filter(m => !m.text?.trim()).length} {c.unreadable}</p>}
            {historical && <p className={styles.emptyDetail}>{c.demoLesson}</p>}
            {!course.lessons.length ? <p className={styles.emptyDetail}>{course.catalogOnly ? uiText("course.downloadNeeded") : c.noLessons}</p> : course.lessons.map(lesson => <div key={lesson.id} className={styles.lesson}>
              {lesson.number !== null ? <label><input type="checkbox" disabled={historical} checked={completedIds.has(lesson.id)} onChange={() => onToggleLesson(course.noteId, lesson.id)} /><span>{lesson.kind ?? uiText("course.lesson")} {String(lesson.number).padStart(2, "0")}{lesson.endNumber && lesson.endNumber !== lesson.number ? `–${String(lesson.endNumber).padStart(2, "0")}` : ""} · {lesson.title}</span></label> : <strong>{c.resources} · {lesson.title}</strong>}
              <ul>{lesson.materials.map(m => <li key={m.id}><SourceLink href={m.url}>{m.title}<ExternalLink size={12} /></SourceLink><span>{m.filePath ? c.archived : c.schoolFile}</span></li>)}</ul>
            </div>)}
            {!!course.assignments.length && <><h3 className={styles.assignmentHeading}>{c.schoolAssignments}</h3><ul className={styles.assignments}>{course.assignments.map(a => <li key={a.id}><SourceLink href={a.url}>{a.title}<ExternalLink size={12} /></SourceLink><span>{c[a.submissionState === "submitted" ? "submitted" : a.submissionState === "missing" ? "missing" : "unknown"]}</span></li>)}</ul></>}
          </div>}
        </article>;
      })}
      {!filtered.length && <div className={styles.empty}><BookOpen size={32} /><h2>{rows.length ? c.notFound : c.empty}</h2><p>{rows.length ? c.searchTip : c.loginTip}</p>{!rows.length && <div className={styles.emptyActions}><button onClick={onOpenSettings}>{uiText("course.schoolSettings")}</button><button onClick={() => setShowPreview(true)}>{c.showDemo}</button></div>}</div>}
    </div>
    <footer className={styles.footer}>{c.footer}</footer>
  </section>;
}
