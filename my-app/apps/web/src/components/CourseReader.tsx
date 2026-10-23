"use client";
import { useId, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Download, ExternalLink, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LmsCourse } from "@/lib/lms-sync";
import { assignmentAvailability, compactSourceTitle, firstReadingMaterial, materialFileUrl, materialIsPdf, readerSections, type CourseLesson } from "@/lib/course-reader";
import { uiText } from "@/lib/messages";
import { useT } from "@/lib/i18n";
import SourceLink from "./SourceLink";
import styles from "./CourseReader.module.css";

interface Props {
  course: LmsCourse;
  completed: Set<string>;
  onToggleLesson: (noteId: string, lessonId: string) => void;
  onOpenSettings: () => void;
}

function lessonLabel(lesson: CourseLesson) {
  if (lesson.number === null) return uiText("course.resources");
  const kind = uiText(lesson.kind === "Week" ? "reader.week" : "course.lesson");
  const range = lesson.endNumber && lesson.endNumber !== lesson.number ? `–${String(lesson.endNumber).padStart(2, "0")}` : "";
  return `${kind} ${String(lesson.number).padStart(2, "0")}${range}`;
}

export default function CourseReader({ course, completed, onToggleLesson, onOpenSettings }: Props) {
  const { lang } = useT();
  const id = useId();
  const sections = useMemo(() => readerSections(course.lessons), [course.lessons]);
  const ordered = [...sections.primary, ...sections.supporting];
  const [selection, setSelection] = useState(() => {
    const initial = sections.primary.find(l => !completed.has(l.id)) || ordered[0];
    return initial ? `lesson:${initial.id}` : course.assignments.length ? "assignments" : "";
  });
  const [files, setFiles] = useState<Record<string, string>>({});
  const [textViews, setTextViews] = useState<Record<string, boolean>>({});
  const fallback = sections.primary.find(l => !completed.has(l.id)) || ordered[0];
  const chosen = ordered.find(l => `lesson:${l.id}` === selection) || fallback;
  const assignments = (selection === "assignments" || !chosen) && course.assignments.length > 0;
  const selected = assignments ? "assignments" : chosen ? `lesson:${chosen.id}` : "";
  const material = chosen?.materials.find(m => m.id === files[chosen.id]) || firstReadingMaterial(chosen?.materials || []);
  const fileUrl = material && materialFileUrl(course, material);
  const pdf = !!material && materialIsPdf(material) && !!fileUrl;
  const video = !!fileUrl && /\.mp4$/i.test(material?.filePath || "");
  const showText = !!material && !!textViews[`${chosen?.id}:${material.id}`];
  const lessonIndex = sections.primary.findIndex(l => l.id === chosen?.id);
  const primary = lessonIndex >= 0;
  const subtitle = chosen ? compactSourceTitle(chosen.title) : "";
  const choose = (value: string) => setSelection(value);

  function navGroup(lessons: CourseLesson[], label: string) {
    if (!lessons.length) return null;
    return <div className={styles.navGroup}><h4>{label}</h4>{lessons.map(lesson => <button key={lesson.id} type="button" aria-current={selected === `lesson:${lesson.id}` ? "page" : undefined} onClick={() => choose(`lesson:${lesson.id}`)}>
      <span><strong>{lessonLabel(lesson)}</strong>{compactSourceTitle(lesson.title) && <small>{compactSourceTitle(lesson.title)}</small>}</span>
      {sections.primary.includes(lesson) && completed.has(lesson.id) ? <Check size={15} aria-label={uiText("reader.completed")} /> : <small>{lesson.materials.length}</small>}
    </button>)}</div>;
  }

  return <div className={styles.reader}>
    <nav className={styles.navigation} aria-label={uiText("reader.contents")}>
      {navGroup(sections.primary, uiText("reader.lessons"))}
      {navGroup(sections.supporting, uiText("reader.supporting"))}
      {!!course.assignments.length && <div className={styles.navGroup}><h4>{uiText("reader.coursework")}</h4><button type="button" aria-current={assignments ? "page" : undefined} onClick={() => choose("assignments")}><strong>{uiText("reader.assignments")}</strong><small>{course.assignments.length}</small></button></div>}
    </nav>
    <label className={styles.mobileNavigation}>{uiText("reader.goTo")}<select value={selected} onChange={event => choose(event.target.value)}>
      {!!sections.primary.length && <optgroup label={uiText("reader.lessons")}>{sections.primary.map(lesson => <option key={lesson.id} value={`lesson:${lesson.id}`}>{lessonLabel(lesson)}{compactSourceTitle(lesson.title) ? ` · ${compactSourceTitle(lesson.title)}` : ""}</option>)}</optgroup>}
      {!!sections.supporting.length && <optgroup label={uiText("reader.supporting")}>{sections.supporting.map(lesson => <option key={lesson.id} value={`lesson:${lesson.id}`}>{lessonLabel(lesson)}{compactSourceTitle(lesson.title) ? ` · ${compactSourceTitle(lesson.title)}` : ""}</option>)}</optgroup>}
      {!!course.assignments.length && <option value="assignments">{uiText("reader.assignments")}</option>}
    </select></label>
    <div className={styles.readingArea}>
      {assignments ? <section className={styles.assignmentPage} aria-labelledby={`${id}-assignments`}>
        <h3 id={`${id}-assignments`}>{uiText("reader.assignments")}</h3><p className={styles.description}>{uiText("reader.assignmentIntro")}</p>
        <ul>{course.assignments.map(assignment => <li key={assignment.id}><div><SourceLink href={assignment.url}>{assignment.title}<ExternalLink size={13} /></SourceLink>{assignment.dueAt && <p>{uiText("reader.due", { date: new Date(assignment.dueAt).toLocaleString(lang === "en" ? "en-GB" : "zh-CN", { timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "short" }) })}</p>}</div><span className={styles.status}>{assignmentAvailability(assignment) ? <>{uiText(assignmentAvailability(assignment) === "upcoming" ? "reader.notOpen" : "reader.closed")}{assignment.opensAt && assignmentAvailability(assignment) === "upcoming" && <small>{uiText("reader.opens", { date: new Date(assignment.opensAt).toLocaleString(lang === "en" ? "en-GB" : "zh-CN", { timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "short" }) })}</small>}</> : uiText(assignment.submissionState === "submitted" ? "course.submitted" : assignment.submissionState === "missing" ? "course.missing" : "course.unknown")}</span></li>)}</ul>
      </section> : chosen ? <section key={chosen.id} className={styles.lessonPage} aria-labelledby={`${id}-lesson`}>
        <header className={styles.lessonHeader}><div><h3 id={`${id}-lesson`}>{lessonLabel(chosen)}{subtitle && <span>{subtitle}</span>}</h3><p>{uiText("reader.fileCount", { count: chosen.materials.length })}</p></div>
          {primary && <label className={styles.completion}><input type="checkbox" checked={completed.has(chosen.id)} onChange={() => onToggleLesson(course.noteId, chosen.id)} />{uiText("reader.markLearned")}</label>}
        </header>
        {!!chosen.materials.length && <div className={styles.fileTabs} role="group" aria-label={uiText("reader.documents")}>{chosen.materials.map(item => <button key={item.id} type="button" title={item.title} aria-pressed={material?.id === item.id} aria-controls={`${id}-document`} onClick={() => setFiles(previous => ({ ...previous, [chosen.id]: item.id }))}><FileText size={15} /><span>{compactSourceTitle(item.title) || item.title}</span></button>)}</div>}
        {material ? <div id={`${id}-document`} className={styles.document}>
          <div className={styles.documentToolbar}>
            {pdf ? <div className={styles.viewOptions} role="group" aria-label={uiText("reader.documentView")}><button type="button" aria-pressed={!showText} onClick={() => setTextViews(previous => ({ ...previous, [`${chosen.id}:${material.id}`]: false }))}>{uiText("reader.originalPdf")}</button><button type="button" aria-pressed={showText} onClick={() => setTextViews(previous => ({ ...previous, [`${chosen.id}:${material.id}`]: true }))}>{uiText("reader.readText")}</button></div> : <span className={styles.documentState}>{uiText(material.text?.trim() ? "reader.savedText" : material.filePath ? "reader.savedFile" : "reader.sourceOnly")}</span>}
            <div className={styles.documentActions}>{fileUrl && <a href={`${fileUrl}&download=1`}><Download size={14} />{uiText("reader.download")}</a>}<SourceLink href={material.url}>{uiText("reader.openSource")}<ExternalLink size={13} /></SourceLink></div>
          </div>
          {video ? <div className={styles.videoDocument}><video controls preload="metadata" src={fileUrl!} aria-label={material.title} /><p>{uiText(material.text?.trim() ? "reader.videoTranscript" : "reader.videoNoTranscript")}</p>{material.text?.trim() && <article className={styles.prose}>{material.text}</article>}</div> : pdf && !showText ? <div className={styles.pdfDocument}><p className={styles.pdfHelp}>{uiText("reader.pdfHelp")} <a href={fileUrl} target="_blank" rel="noreferrer">{uiText("reader.openDocument")}</a></p><iframe src={`${fileUrl}#toolbar=1&navpanes=0&view=FitH`} title={material.title} loading="lazy" /></div> : material.text?.trim() ? <article className={styles.prose}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => <SourceLink href={href}>{children}</SourceLink>, img: ({ alt }) => <span>{alt}</span> }}>{material.text}</ReactMarkdown>
            {material.textStatus === "truncated" && <p className={styles.textNotice}>{uiText("reader.truncated")}</p>}
          </article> : <div className={styles.emptyDocument}><BookOpen size={30} /><h4>{uiText(material.filePath ? "reader.noText" : "reader.notDownloaded")}</h4><p>{uiText(material.filePath ? /\.md$/i.test(material.filePath) && /submission|deliverable/i.test(material.title) ? "reader.emptyPage" : "reader.noTextHelp" : "reader.downloadHelp")}</p>{!material.filePath && <button type="button" onClick={onOpenSettings}>{uiText("course.schoolSettings")}</button>}</div>}
          <div className={styles.sourceName}>{material.title}</div>
        </div> : <p className={styles.emptyDocument}>{uiText("reader.noFiles")}</p>}
        {primary && <footer className={styles.lessonNavigation}><button type="button" disabled={lessonIndex === 0} onClick={() => choose(`lesson:${sections.primary[lessonIndex - 1].id}`)}><ArrowLeft size={15} />{uiText("reader.previous")}</button><span>{uiText("reader.position", { current: lessonIndex + 1, total: sections.primary.length })}</span><button type="button" disabled={lessonIndex === sections.primary.length - 1} onClick={() => choose(`lesson:${sections.primary[lessonIndex + 1].id}`)}>{uiText("reader.next")}<ArrowRight size={15} /></button></footer>}
      </section> : <p className={styles.emptyDocument}>{uiText("reader.noFiles")}</p>}
    </div>
  </div>;
}
