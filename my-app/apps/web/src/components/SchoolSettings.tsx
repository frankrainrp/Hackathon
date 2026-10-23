"use client";
import { useEffect, useState } from "react";
import { appFetch as fetch, uiText, localizeExternal, stateLabel } from "@/lib/messages";
import { activeProfile, emptyProfiles, supportsSchoolConnection, type ProfileSettings, type ProfileInput } from "@/lib/lms-profile";
import type { LmsFeed } from "@/lib/lms-sync";
import type { WeeklyPlan } from "@/lib/weekly-plan";
import type { LearningPlan } from "@/lib/learning-plan";
import { useT } from "@/lib/i18n";
import styles from "./CoursesPanel.module.css";

type Job = { profileId: string; state: "running" | "complete" | "error"; message: string };
export default function SchoolSettings({ feed, initialOpen = false, onSaved }: { feed: LmsFeed | null; initialOpen?: boolean; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(initialOpen);
  const { lang } = useT();
  const [weekly, setWeekly] = useState<WeeklyPlan>({ profileId: "", enabled: false });
  const [learning, setLearning] = useState<LearningPlan>({profileId:"",enabled:false,downloadSelected:true});
  const [settings, setSettings] = useState<ProfileSettings>(emptyProfiles);
  const [entryUrl, setEntryUrl] = useState(""), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), [job, setJob] = useState<Job | null>(null);
  const profile = activeProfile(settings);
  const semester = profile?.semesters.find(s => s.id === profile.activeSemesterId);
  const running = job?.state === "running";
  async function refresh(initial = false) {
    const response = await fetch("/api/lms/settings", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || uiText("school.auto.loadFailed"));
    setSettings(data.settings); setJob(data.job); setWeekly(data.weekly); setLearning(data.learningSync);
    if (initial) setEntryUrl(activeProfile(data.settings)?.entryUrl || "");
    return data;
  }
  useEffect(() => { let live = true;
    void fetch("/api/lms/settings", { cache: "no-store" }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(uiText("school.auto.loadFailed"));
      if (live) { setSettings(data.settings); setJob(data.job); setWeekly(data.weekly); setLearning(data.learningSync); setEntryUrl(activeProfile(data.settings)?.entryUrl || ""); }
    }).catch(error => { if (live) setMessage(error.message); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!running && !weekly.enabled && !learning.enabled) return;
    const timer = setInterval(() => { void refresh().then(data => { if (data.job?.state !== "running") onSaved(); }).catch(error => { setMessage(error.message); setJob(null); }); }, running ? 1500 : 30000);
    return () => clearInterval(timer);
  }, [running, weekly.enabled, learning.enabled]);
  async function send(body: Record<string, unknown>) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/lms/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || uiText("school.auto.loadFailed"));
      const refreshed = await refresh();
      if (data.job) setJob(data.job);
      else { setEntryUrl(activeProfile(data.settings || refreshed.settings)?.entryUrl || entryUrl); setMessage(body.action === "weekly" ? uiText("weekly.saved") : uiText("school.auto.saved")); onSaved(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : uiText("school.auto.loadFailed")); }
    finally { setBusy(false); }
  }
  function editCourse(id: string, update: Partial<ProfileInput["semester"]["courses"][number]>) {
    if (!profile || !semester) return;
    const { semesters: _history, activeSemesterId: _active, origin: _origin, domain: _domain, confirmedAt: _at, ...fields } = profile;
    void send({ confirm: true, profile: { ...fields, semester: { ...semester, courses: semester.courses.map(c => c.id === id ? { ...c, ...update } : c) } } });
  }
  return <details className={styles.settings} open={expanded} onToggle={e => setExpanded(e.currentTarget.open)}>
    <summary>{uiText("school.auto.title")}</summary>
    <p>{uiText("school.auto.intro")}</p>
    <form onSubmit={event => { event.preventDefault(); void send({ entryUrl, confirm: true }); }}>
      {settings.profiles.length > 1 && <label>{uiText("school.auto.savedSchools")}<select disabled={busy || running} value={settings.profiles.find(p => p.entryUrl === entryUrl)?.id || ""} onChange={e => { setEntryUrl(settings.profiles.find(p => p.id === e.target.value)?.entryUrl || ""); setMessage(""); }}><option value="">{uiText("school.auto.newSchool")}</option>{settings.profiles.map(p => <option key={p.id} value={p.id}>{p.school}</option>)}</select></label>}
      <label>{uiText("school.auto.url")}<input required type="url" maxLength={2000} value={entryUrl} disabled={busy || running} onChange={e => { setEntryUrl(e.target.value); setMessage(""); }} placeholder="https://tplms.polite.edu.sg/d2l/home" autoComplete="url" /></label>
      <div className={styles.actions}><button type="submit" disabled={busy || running}>{busy ? uiText("school.auto.working") : uiText("school.auto.findSchool")}</button></div>
    </form>
    {profile && <>
      <div className={styles.schoolIdentity}><strong>{profile.school}</strong><p>{profile.entryUrl}</p><p>{uiText("school.auto.semester", { name: semester?.confirmed ? semester.label : uiText("school.auto.pendingTerm") })}</p></div>
      <div className={styles.actions}>
        <button disabled={busy || running || entryUrl !== profile.entryUrl || !supportsSchoolConnection(profile.domain, profile.platform)} onClick={() => void send({ action: "login" })}>{uiText("school.auto.login")}</button>
        <button disabled={busy || running || entryUrl !== profile.entryUrl || !supportsSchoolConnection(profile.domain, profile.platform)} onClick={() => void send({ action: "catalog" })}>{uiText("school.auto.refresh")}</button>
        <button disabled={busy || running || entryUrl !== profile.entryUrl || !supportsSchoolConnection(profile.domain, profile.platform) || !semester?.confirmed || !semester.courses.some(c => c.selected && c.status === "active")} onClick={() => void send({ action: "sync" })}>{uiText("school.auto.download")}</button>
        {running && <button disabled={busy} onClick={() => void send({ action: "cancel" })}>{uiText("school.auto.cancel")}</button>}
      </div>
      <p>{uiText(supportsSchoolConnection(profile.domain, profile.platform) ? "school.auto.loginHelp" : "school.auto.connectionUnsupported")}</p>
      {supportsSchoolConnection(profile.domain, profile.platform) && <div className={styles.weeklyOptions}>
        <label className={styles.weeklyToggle}><input type="checkbox" checked={learning.enabled} disabled={busy || running} onChange={e => void send({ action: "learning-sync", enabled: e.target.checked })} />{uiText("learning.enable")}</label>
        <p>{uiText("learning.help")}</p>
        {learning.requiresLogin && <p role="status">{uiText("learning.loginRequired")}</p>}
        {learning.enabled && !learning.requiresLogin && <button disabled={busy || running} onClick={() => void send({action:"learning-sync-now"})}>{uiText("learning.refreshNow")}</button>}
        {learning.enabled && learning.nextRunAt && !learning.requiresLogin && <p>{uiText("learning.next",{date:new Date(learning.nextRunAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-GB")})}</p>}
        {learning.lastSuccessfulAt && <p>{uiText("learning.lastSuccess",{date:new Date(learning.lastSuccessfulAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-GB")})}</p>}
        {learning.result === "error" && <p role="status">{localizeExternal(learning.message || uiText("school.auto.workerFailed"))}</p>}
        <label className={styles.weeklyToggle}><input type="checkbox" checked={weekly.enabled} disabled={busy || running} onChange={e => void send({ action: "weekly", enabled: e.target.checked })} />{uiText("weekly.enable")}</label>
        <p>{uiText("weekly.help")}</p>
        {weekly.enabled && <button disabled={busy || running} onClick={() => void send({ action: "weekly-check", force: true })}>{uiText("weekly.checkNow")}</button>}
        {weekly.nextRunAt && weekly.enabled && <p>{uiText("weekly.next", { date: new Date(weekly.nextRunAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Singapore" }) })}</p>}
        {weekly.result === "complete" && <p role="status">{uiText(weekly.missingCount ? "weekly.missing" : "weekly.none", { count: weekly.missingCount || 0 })}</p>}
        {!!weekly.unknownCount && <p>{uiText("weekly.unknown", { count: weekly.unknownCount })}</p>}
        {weekly.result === "error" && <p role="status">{localizeExternal(weekly.message || uiText("school.auto.workerFailed"))}</p>}
      </div>}
      {!!semester?.courses.length && <fieldset disabled={busy || running}><legend>{uiText("school.auto.courses", { count: semester.courses.length })}</legend>{semester.courses.map(c => <div className={styles.courseSetting} key={c.id}><label><input type="checkbox" checked={c.selected} onChange={e => editCourse(c.id, { selected: e.target.checked })} />{c.name}</label><select aria-label={uiText("school.courseStatus", { name: c.name })} value={c.status} onChange={e => editCourse(c.id, { status: e.target.value as "active" | "completed" | "paused" })}><option value="active">{uiText("ui.schoolsettings.9234069589")}</option><option value="completed">{uiText("ui.schoolsettings.22a970d2e5")}</option><option value="paused">{uiText("ui.schoolsettings.e159b06187")}</option></select></div>)}</fieldset>}
      {profile.semesters.length > 1 && <details><summary>{uiText("school.auto.history")}</summary>{profile.semesters.filter(s => s.id !== profile.activeSemesterId).map(s => <p key={s.id}>{s.label} · {uiText("school.auto.courses", { count: s.courses.length })}</p>)}</details>}
    </>}
    <div role="status" aria-live="polite"><p>{localizeExternal(message)}</p>{job && <p>{localizeExternal(job.message)}</p>}</div>
    <p>{uiText("school.auto.retention")}</p>
    {!!feed?.syncHistory?.length && <details><summary>{uiText("course.syncHistory")}</summary><ul>{feed.syncHistory.slice(-10).reverse().map(s => <li key={`${s.profileId}-${s.semesterId}-${s.syncedAt}`}>{s.syncedAt} · {s.semesterId || uiText("course.legacy")} · {stateLabel(s.status)}</li>)}</ul></details>}
    <a href="/api/lms/settings?export=1" download>{uiText("ui.schoolsettings.3dd7932ba8")}</a>
  </details>;
}
