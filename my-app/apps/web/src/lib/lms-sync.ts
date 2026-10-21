
import { uiText, translate, getUiLanguage, type Lang, type MessageParams } from "./messages.ts";
import type { LmsSnapshot } from "./lms-schema";
import type { ChatMessage, ChatSession, DdlItem, Note } from "./types";
import type { ProfileSettings } from "./lms-profile";

export interface LmsFeed {
  revision: number;
  ddls: DdlItem[];
  notes: Note[];
  sessions: ChatSession[];
  messages: ChatMessage[];
  courses?: LmsCourse[];
  status?: { status: string; syncedAt: string; warnings: string[] };
  syncHistory?: { profileId?: string; semesterId?: string; syncedAt: string; status: string; warnings: string[] }[];
}

export type LmsCourse = LmsSnapshot["courses"][number] & { school: string; noteId: string; profileId?: string; semesterId?: string; semesterLabel?: string; archived?: boolean };

export function archiveLmsHistory(feed: LmsFeed, profileId?: string, semesterId?: string): LmsFeed {
  return { ...feed, revision: feed.revision + 1,
    courses: feed.courses?.map(c => ({ ...c, archived: c.profileId !== profileId || c.semesterId !== semesterId })),
    ddls: feed.ddls.map(d => ({ ...d, lmsArchived: d.lmsProfileId !== profileId || d.lmsSemesterId !== semesterId })) };
}
export function applyProfileMetadata(feed: LmsFeed, settings: ProfileSettings): LmsFeed {
  const active = settings.profiles.find(p => p.id === settings.activeProfileId);
  const next = archiveLmsHistory(feed, active?.id, active?.activeSemesterId);
  next.courses = next.courses?.map(c => {
    const semester = settings.profiles.find(p => p.id === c.profileId)?.semesters.find(s => s.id === c.semesterId);
    const choice = semester?.courses.find(item => item.id === c.id);
    return { ...c, semesterLabel: semester?.label || c.semesterLabel, courseStatus: choice?.status || c.courseStatus };
  });
  return next;
}

const sourceKey = (s: LmsSnapshot) => new URL(s.baseUrl).hostname.replace(/[^a-zA-Z0-9_-]/g, "_");
const signature = (x: unknown) => JSON.stringify(x);
export function lmsScopePrefix(snapshot: LmsSnapshot) {
  const scope = snapshot.profileId && snapshot.semesterId ? `p${snapshot.profileId.length}_${snapshot.profileId}-s${snapshot.semesterId.length}_${snapshot.semesterId}-` : "";
  return `lms-${sourceKey(snapshot)}-${scope}`;
}
/** A brief must not mix another profile/semester's reminders or submission facts. */
export function selectLmsBriefFacts(feed: LmsFeed, snapshot: LmsSnapshot) {
  const sessionId = `${lmsScopePrefix(snapshot)}session`;
  const messages = feed.messages.filter(m => m.sessionId === sessionId);
  const lastBriefAt = Math.max(0, ...messages.filter(m => m.id.endsWith("-brief")).map(m => new Date(m.timestamp).getTime()));
  return { pendingFacts: messages.filter(m => !m.id.endsWith("-brief") && new Date(m.timestamp).getTime() > lastBriefAt),
    tasks: feed.ddls.filter(d => d.lmsProfileId === snapshot.profileId && d.lmsSemesterId === snapshot.semesterId) };
}

function localDue(value: string | null, timeZone: string) {
  if (!value) return { dueDate: "", dueTime: "" };
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const get = (name: string) => parts.find(p => p.type === name)?.value || "";
  return { dueDate: `${get("year")}-${get("month")}-${get("day")}`, dueTime: `${get("hour")}:${get("minute")}` };
}

/** Deterministic facts are authoritative; AI only supplies a bounded optional brief. */
export function buildLmsFeed(snapshot: LmsSnapshot, previous: LmsFeed, now = Date.now(), language: Lang = getUiLanguage()): LmsFeed {
  const uiText = (key: string, params?: MessageParams) => translate(key, language, params);
  const prefix = lmsScopePrefix(snapshot);
  const sessionId = `${prefix}session`;
  const tasks = new Map(previous.ddls.map(d => [d.id, d]));
  const notes = new Map(previous.notes.map(n => [n.id, n]));
  const messages = new Map(previous.messages.map(m => [m.id, m]));
  const courses = new Map((previous.courses || []).map(c => [c.noteId, c]));
  const changes: string[] = [];
  const nearDue: string[] = [];
  let reminderBand = 0;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: snapshot.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now)).replace(/[^0-9]/g, "");
  const addMessage = (id: string, content: string) => {
    if (!messages.has(id)) messages.set(id, { id, sessionId, role: "assistant", content, timestamp: new Date(now) });
  };
  for (const course of snapshot.courses) {
    for (const assignment of course.assignments) {
      const id = `${prefix}${course.id}-assignment-${assignment.id}`;
      const { dueDate, dueTime } = localDue(assignment.dueAt, snapshot.timezone);
      const old = tasks.get(id);
      // Unreadable submission status must not regress the last confirmed status.
      const state = assignment.submissionState === "unknown" && old?.lmsSubmissionState ? old.lmsSubmissionState : assignment.submissionState;
      const done = state === "submitted";
      const task: DdlItem = { id, taskName: assignment.title, source: course.moduleName, weight: null,
        dueDate, dueTime, completed: done, status: done ? "done" : "todo", isGroupWork: false,
        description: `${snapshot.school} · ${snapshot.timezone} · ${assignment.submissionState === "unknown" ? uiText("ui.lmssync.aaabf6d98f") : done ? uiText("ui.lmssync.c6cbb39cc9") : uiText("ui.lmssync.db929e1912")}`,
        priority: assignment.dueAt && new Date(assignment.dueAt).getTime() - now <= 86400000 && !done ? "high" : "med",
        tags: ["LMS", snapshot.school], lmsSubmissionState: state, lmsDueAt: assignment.dueAt,
        attachments: [{ id: `${id}-link`, kind: "url", label: uiText("ui.lmssync.d88fb3e36f"), ref: assignment.url }],
        lmsProfileId: snapshot.profileId, lmsSemesterId: snapshot.semesterId,
      };
      if (old) { task.notes = old.notes; task.noteId = old.noteId; }
      if (old && old.lmsSubmissionState === state) { task.status = old.status; task.completed = old.completed; }
      tasks.set(id, task);
      if (!old) changes.push(uiText("ui.lmssync.eee4f71f3b", { value0: course.moduleName, value1: assignment.title, value2: state === "submitted" ? uiText("lms.submitted") : state === "missing" ? uiText("lms.missing") : uiText("lms.unknown") }));
      else if (old.lmsDueAt !== assignment.dueAt) changes.push(uiText("ui.lmssync.9961992fc6", { value0: assignment.title }));
      else if (old.lmsSubmissionState !== state) changes.push(`${assignment.title}：${state === "submitted" ? uiText("ui.lmssync.bc37a6110a") : uiText("ui.lmssync.c3e1b36bcd")}`);
      if (assignment.submissionState === "missing" && assignment.dueAt) {
        const left = new Date(assignment.dueAt).getTime() - now;
        if (left <= 86400000) {
          const band = left <= 0 ? 3 : left <= 21600000 ? 2 : 1;
          reminderBand = Math.max(reminderBand, band);
          nearDue.push(uiText("ui.lmssync.b7c6ced888", { value0: assignment.title, value1: course.moduleName, value2: left <= 0 ? uiText("lms.overdue") : uiText("lms.hoursLeft", { count: Math.ceil(left / 3600000) }), value3: dueDate, value4: dueTime, value5: snapshot.timezone, value6: assignment.url }));
        }
      }
    }
    const noteId = `${prefix}${course.id}-index`;
    const oldCourse = courses.get(noteId);
    courses.set(noteId, { ...course, assignments: course.assignments.map(a => a.submissionState === "unknown" ? { ...a, submissionState: oldCourse?.assignments.find(old => old.id === a.id)?.submissionState || "unknown" } : a), school: snapshot.school, noteId,
      profileId: snapshot.profileId, semesterId: snapshot.semesterId, semesterLabel: snapshot.semesterLabel });
    const content = [`# ${course.moduleName}`, "", uiText("ui.lmssync.ad27a9923a", { value0: snapshot.school }), "", ...course.lessons.flatMap(l => [
      `## ${l.number === null ? uiText("course.resources") : `${l.kind ?? uiText("course.lesson")} ${String(l.number).padStart(2, "0")}${l.endNumber && l.endNumber !== l.number ? `-${String(l.endNumber).padStart(2, "0")}` : ""}`} · ${l.title}`,
      ...l.materials.map(m => `- [${m.title}](${m.url})${m.filePath ? uiText("ui.lmssync.7a46a5d99a", { value0: m.filePath }) : ""}`), "",
    ]), uiText("ui.lmssync.43f01c86a3"), "", ...course.announcements.map(a => `- [${a.title}](${a.url})\n${a.text}`)].join("\n");
    const oldNote = notes.get(noteId);
    const materials = course.lessons.flatMap(l => l.materials);
    const oldMaterials = new Map((oldNote?.lmsMaterials || []).map(m => [m.id, m]));
    const changed = materials.filter(m => !oldMaterials.has(m.id) || oldMaterials.get(m.id)?.modifiedAt !== m.modifiedAt);
    if (changed.length) changes.push(uiText("ui.lmssync.61492a6a78", { value0: course.moduleName, value1: changed.length }));
    const announcementVersion = signature(course.announcements);
    if (course.announcements.length && oldNote?.lmsAnnouncements !== announcementVersion) changes.push(uiText("ui.lmssync.32bbe06169", { value0: course.moduleName }));
    notes.set(noteId, { id: noteId, title: course.moduleName, content, tags: ["LMS", snapshot.school], lmsCompletedLessons: oldNote?.lmsCompletedLessons,
      createdAt: oldNote?.createdAt || now, updatedAt: oldNote?.content === content ? oldNote.updatedAt : now,
      lmsMaterials: materials.map(m => ({ id: m.id, modifiedAt: m.modifiedAt || null })), lmsAnnouncements: announcementVersion });
  }
  if (changes.length) addMessage(`${prefix}changes-${snapshot.syncedAt.replace(/[^0-9]/g, "")}`,
    uiText("ui.lmssync.a2c6c12126", { value0: changes.slice(0, 20).map(c => `- ${c}`).join("\n"), value1: changes.length > 20 ? uiText("lms.moreChanges", { count: changes.length - 20 }) : "" }));
  if (nearDue.length) addMessage(`${prefix}reminder-${day}-${reminderBand}`,
    uiText("ui.lmssync.606075bff9", { value0: nearDue.length, value1: nearDue.slice(0, 20).join("\n") }));
  const oldStatus = previous.status;
  if (snapshot.status === "login_required" && oldStatus?.status !== "login_required") {
    addMessage(`${prefix}login-${now}`, uiText("ui.lmssync.53c730fe4e"));
  } else if (snapshot.status !== "ok" && snapshot.status !== "login_required" && signature(oldStatus?.warnings) !== signature(snapshot.warnings)) {
    addMessage(`${prefix}warning-${now}`, uiText("ui.lmssync.6d7fe061cc", { value0: snapshot.warnings.slice(0, 10).map(w => `- ${w}`).join("\n") }));
  }
  const sessions = previous.sessions.filter(s => s.id !== sessionId);
  sessions.push({ id: sessionId, title: uiText("ui.lmssync.bcd581c37b", { value0: snapshot.school }), createdAt: previous.sessions.find(s => s.id === sessionId)?.createdAt || now,
    updatedAt: messages.size !== previous.messages.length ? now : previous.sessions.find(s => s.id === sessionId)?.updatedAt || now });
  const syncHistory = (previous.syncHistory || []).filter(s => !(s.profileId === snapshot.profileId && s.semesterId === snapshot.semesterId && s.syncedAt === snapshot.syncedAt));
  syncHistory.push({ profileId: snapshot.profileId, semesterId: snapshot.semesterId, syncedAt: snapshot.syncedAt, status: snapshot.status, warnings: snapshot.warnings });
  const feed = { revision: previous.revision + 1, ddls: Array.from(tasks.values()), notes: Array.from(notes.values()), courses: Array.from(courses.values()), sessions, syncHistory,
    messages: Array.from(messages.values()).slice(-300), status: { status: snapshot.status, syncedAt: snapshot.syncedAt, warnings: snapshot.warnings } };
  return snapshot.profileId ? archiveLmsHistory(feed, snapshot.profileId, snapshot.semesterId) : feed;
}

/** Preserve edits on ordinary tasks; submission status changes are school facts. */
export function mergeLmsTasks(local: DdlItem[], incoming: DdlItem[]) {
  const result = new Map(local.map(d => [d.id, d]));
  for (const task of incoming) {
    const old = result.get(task.id);
    result.set(task.id, old ? { ...old, ...task, notes: old.notes, noteId: old.noteId,
      status: old.lmsSubmissionState === task.lmsSubmissionState ? old.status : task.status,
      completed: old.lmsSubmissionState === task.lmsSubmissionState ? old.completed : task.completed } : task);
  }
  return Array.from(result.values());
}

export function mergeLmsRows<T extends { id: string }>(local: T[], incoming: T[]) {
  const result = new Map(local.map(row => [row.id, row]));
  for (const row of incoming) result.set(row.id, row);
  return Array.from(result.values());
}

export function mergeLmsNotes(local: Note[], incoming: Note[]): Note[] {
  const old = new Map(local.map(n => [n.id, n]));
  return mergeLmsRows(local, incoming.map(n => ({ ...n,
    lmsCompletedLessons: old.get(n.id)?.lmsCompletedLessons ?? n.lmsCompletedLessons })));
}
