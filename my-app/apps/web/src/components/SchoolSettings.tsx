"use client";

import { useEffect, useState } from "react";
import { emptyProfiles, previewProfile, supportsSchoolConnection, type ProfileInput, type ProfileSettings, type SchoolProfile } from "@/lib/lms-profile";
import type { LmsFeed } from "@/lib/lms-sync";
import styles from "./CoursesPanel.module.css";

const blank = (): ProfileInput => ({ id: crypto.randomUUID(), school: "", entryUrl: "", platform: "brightspace", semester: { id: crypto.randomUUID(), label: "", confirmed: true, courses: [] }, daily: { time: "09:00", timezone: "Asia/Singapore" } });
export default function SchoolSettings({ feed, lang, onSaved }: { feed: LmsFeed | null; lang: "zh" | "en"; onSaved: () => void }) {
  const zh = lang === "zh";
  const [settings, setSettings] = useState<ProfileSettings>(emptyProfiles);
  const [draft, setDraft] = useState<ProfileInput | null>(null);
  const [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = useState<ReturnType<typeof previewProfile> | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  function choose(profile?: SchoolProfile) {
    setPreview(null);
    setDraft(profile ? { id: profile.id, school: profile.school, entryUrl: profile.entryUrl, platform: profile.platform, daily: profile.daily, semester: profile.semesters.find(s => s.id === profile.activeSemesterId)! } : blank());
  }
  useEffect(() => {
    let cancelled = false;
    fetch("/api/lms/settings", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error("Settings unavailable"); return r.json(); }).then(data => {
      if (cancelled) return;
      setSettings(data.settings); setCatalog(data.catalog);
      choose(data.settings.profiles.find((p: SchoolProfile) => p.id === data.settings.activeProfileId));
    }).catch(() => { if (!cancelled) setMessage(zh ? "无法读取本机配置，请重试。" : "Cannot read local settings. Retry."); });
    return () => { cancelled = true; };
  // Settings are loaded once, without contacting a school.
  }, []);
  function change(update: Partial<ProfileInput>) { if (draft) { setDraft({ ...draft, ...update }); setPreview(null); setMessage(""); } }
  async function submit(confirm: boolean) {
    setBusy(true); setMessage("");
    try {
      previewProfile(draft);
      const response = await fetch("/api/lms/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile: draft, confirm }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save settings");
      if (!confirm) setPreview(data.preview);
      else { setSettings(data.settings); setCatalog(data.catalog); setPreview(null); setMessage(zh ? "已保存。后台计划尚未启用；学校登录仍需另行完成。" : "Saved. No background schedule has been enabled; school login is a separate step."); onSaved(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid settings"); }
    finally { setBusy(false); }
  }
  const known = settings.profiles.find(p => p.id === draft?.id);
  const candidates = new Map(catalog.map(c => [c.id, c]));
  for (const c of feed?.courses || []) if (c.profileId === draft?.id) candidates.set(c.id, { id: c.id, name: c.moduleName });
  for (const c of draft?.semester.courses || []) candidates.set(c.id, c);
  return <details className={styles.settings}>
    <summary>{zh ? "学校、学期与每日检查设置" : "School, semester and daily checks"}</summary>
    <p>{zh ? "档案、课程状态与历史保存在本机。示例不是你的学校；自由描述不会自动选择学校。" : "Profiles, course status and history stay on this computer. Examples are not your school; descriptions are not used to infer it."}</p>
    {draft && <form onSubmit={event => { event.preventDefault(); void submit(false); }}>
      <div className={styles.settingsGrid}>
        <label>{zh ? "已保存的学校" : "Saved school"}<select value={known?.id || "new"} onChange={e => { choose(settings.profiles.find(p => p.id === e.target.value)); setCatalog([]); }}><option value="new">{zh ? "新学校 / 独立登录" : "New school / separate login"}</option>{settings.profiles.map(p => <option key={p.id} value={p.id}>{p.school} · {p.domain}</option>)}</select></label>
        <label>{zh ? "学校名称（由你填写）" : "School name (your description)"}<input required maxLength={160} value={draft.school} onChange={e => change({ school: e.target.value })} /></label>
        <label>{zh ? "HTTPS 学校 LMS 入口" : "HTTPS school LMS entry"}<input required type="url" placeholder="https://school.example.edu/d2l/home" value={draft.entryUrl} onChange={e => change({ entryUrl: e.target.value })} /></label>
        <label>{zh ? "平台" : "Platform"}<select value={draft.platform} onChange={e => change({ platform: e.target.value as ProfileInput["platform"] })}><option value="brightspace">Brightspace / PoliteMall</option><option value="unsupported">{zh ? "其他 LMS（仅保存，尚不支持同步）" : "Other LMS (saved only; sync unsupported)"}</option></select></label>
      </div>
      <div className={styles.actions}>{[["Temasek Polytechnic", "https://tplms.polite.edu.sg/d2l/home"], ["Republic Polytechnic", "https://rplms.polite.edu.sg/d2l/home"]].map(([school, entryUrl]) => <button type="button" key={school} onClick={() => { const next = blank(); setDraft({ ...next, school, entryUrl }); setPreview(null); setCatalog([]); }}>{zh ? "填入示例：" : "Use example: "}{school}</button>)}</div>
      <div className={styles.settingsGrid}>
        <label>{zh ? "学期记录" : "Semester record"}<select value={known?.semesters.some(s => s.id === draft.semester.id) ? draft.semester.id : "new"} onChange={e => change({ semester: known?.semesters.find(s => s.id === e.target.value) || { id: crypto.randomUUID(), label: "", confirmed: true, courses: [] } })}><option value="new">{zh ? "确认新学期（保留旧记录）" : "Confirm a new semester (retain history)"}</option>{known?.semesters.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label>{zh ? "当前学期名称（需确认）" : "Current semester label (confirm below)"}<input required maxLength={160} placeholder="2026/2027 Semester 1" value={draft.semester.label} onChange={e => change({ semester: { ...draft.semester, label: e.target.value } })} /></label>
        <label>{zh ? "每日检查时间" : "Daily check time"}<input required type="time" value={draft.daily.time} onChange={e => change({ daily: { ...draft.daily, time: e.target.value } })} /></label>
        <label>{zh ? "计划时区" : "Schedule timezone"}<select value={draft.daily.timezone} onChange={e => change({ daily: { ...draft.daily, timezone: e.target.value as "Asia/Singapore" | "UTC" } })}><option>Asia/Singapore</option><option>UTC</option></select></label>
      </div>
      <fieldset><legend>{zh ? "本学期课程：选择下载范围与课程状态" : "This semester: download selection and course status"}</legend>
        {Array.from(candidates.values()).map(c => { const selected = draft.semester.courses.find(x => x.id === c.id); const edit = (update: Partial<ProfileInput["semester"]["courses"][number]>) => change({ semester: { ...draft.semester, courses: draft.semester.courses.filter(x => x.id !== c.id).concat({ id: c.id, name: c.name, selected: false, status: "active", ...selected, ...update }) } }); return <div key={c.id} className={styles.courseSetting}><label><input type="checkbox" checked={selected?.selected || false} onChange={e => edit({ selected: e.target.checked })} />{c.id} · {c.name}</label><select aria-label={`${c.name} status`} value={selected?.status || "active"} onChange={e => edit({ status: e.target.value as "active" | "completed" | "paused" })}><option value="active">{zh ? "在读" : "Active"}</option><option value="completed">{zh ? "已完成" : "Completed"}</option><option value="paused">{zh ? "暂停" : "Paused"}</option></select></div>; })}
        <div className={styles.settingsGrid}><label>{zh ? "课程 ID" : "Course ID"}<input value={courseId} onChange={e => setCourseId(e.target.value)} /></label><label>{zh ? "课程名称" : "Course name"}<input value={courseName} onChange={e => setCourseName(e.target.value)} /></label></div>
        <button type="button" disabled={!/^[a-zA-Z0-9_-]{1,100}$/.test(courseId) || !courseName.trim()} onClick={() => { change({ semester: { ...draft.semester, courses: draft.semester.courses.filter(c => c.id !== courseId).concat({ id: courseId, name: courseName.trim(), selected: true, status: "active" }) } }); setCourseId(""); setCourseName(""); }}>{zh ? "添加课程" : "Add course"}</button>
        <p>{zh ? "没有课程 ID 时，先保存档案，再人工登录并运行 catalog；重新打开页面后选择课程。未选择课程不会下载全部选课。" : "Without course IDs, save the profile, sign in manually and run catalog; reload to select courses. An empty selection never downloads all enrollments."}</p>
      </fieldset>
      <button type="submit" disabled={busy}>{busy ? (zh ? "处理中…" : "Working…") : (zh ? "预览并核对" : "Preview settings")}</button>
      {preview && <div className={styles.notice}><div><strong>{preview.school} · {preview.domain}</strong><p>{preview.entryUrl}<br />{preview.semester.label} · {preview.semester.courses.filter(c => c.selected && c.status === "active").length} {zh ? "门在读课程" : "active courses"}<br />{zh ? "每日" : "Daily"} {preview.daily.time} ({preview.daily.timezone}) · {supportsSchoolConnection(preview.domain, preview.platform) ? "Brightspace" : (zh ? "仅保存档案：该平台或域名尚无安全连接支持，不能登录或同步" : "Profile only: this platform/domain has no reviewed connection policy; login and sync are blocked")}</p><button type="button" disabled={busy} onClick={() => void submit(true)}>{zh ? "确认学校、入口和当前学期并保存" : "Confirm school, entry and current semester; save"}</button></div></div>}
    </form>}
    <p role="status">{message}</p>
    <p>{zh ? "每日检查可能错过不足一天的新截止通知。保存设置不等于启用后台访问；登录过期需人工重新登录。" : "Daily checks may miss deadlines announced less than a day ahead. Saving settings does not enable background access; expired sessions require manual login."}</p>
    <p>{zh ? "当前连接策略只支持 TP/RP 的明确学校域名及审核过的 Microsoft 登录域名。其他学校可保存名称、入口和历史，接入安全连接策略前不会发起学校请求。" : "Connections currently support the explicit TP/RP LMS hosts and reviewed Microsoft sign-in hosts. Other school profiles and history can be saved; no school request is made until their connection policy is implemented."}</p>
    <a href="/api/lms/settings?export=1" download>{zh ? "导出本机档案、历史与任务备份（不含会话凭据）" : "Export local profiles, history and tasks (no session credentials)"}</a>
    <p>{zh ? "数据保留到你主动清理为止，不保证磁盘故障后仍可恢复。请保存导出备份。" : "Records remain until you remove them; disk loss is not recoverable without a backup."}</p>
  </details>;
}
