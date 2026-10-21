"use client";
import { appFetch as fetch } from "@/lib/messages";

import { uiText, localizeExternal } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";


import { useEffect, useState } from "react";
import { emptyProfiles, previewProfile, supportsSchoolConnection, type ProfileInput, type ProfileSettings, type SchoolProfile } from "@/lib/lms-profile";
import type { LmsFeed } from "@/lib/lms-sync";
import styles from "./CoursesPanel.module.css";

const blank = (): ProfileInput => ({ id: crypto.randomUUID(), school: "", entryUrl: "", platform: "brightspace", semester: { id: crypto.randomUUID(), label: "", confirmed: true, courses: [] }, daily: { time: "09:00", timezone: "Asia/Singapore" } });
export default function SchoolSettings({ feed, lang, onSaved }: { feed: LmsFeed | null; lang: "zh" | "en"; onSaved: () => void }) {
  const uiLanguage = useCopyLanguage().lang;
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
    fetch("/api/lms/settings", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(uiText("ui.schoolsettings.ba1edae911")); return r.json(); }).then(data => {
      if (cancelled) return;
      setSettings(data.settings); setCatalog(data.catalog);
      choose(data.settings.profiles.find((p: SchoolProfile) => p.id === data.settings.activeProfileId));
    }).catch(() => { if (!cancelled) setMessage(zh ? uiText("ui.schoolsettings.c0e9326e42") : uiText("ui.schoolsettings.fa1054ba2f")); });
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
      if (!response.ok) throw new Error(data.error || uiText("ui.schoolsettings.ac2890606d"));
      if (!confirm) setPreview(data.preview);
      else { setSettings(data.settings); setCatalog(data.catalog); setPreview(null); setMessage(zh ? uiText("ui.schoolsettings.006ca315b6") : uiText("school.saved")); onSaved(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : uiText("ui.schoolsettings.ffd4419ee9")); }
    finally { setBusy(false); }
  }
  const known = settings.profiles.find(p => p.id === draft?.id);
  const candidates = new Map(catalog.map(c => [c.id, c]));
  for (const c of feed?.courses || []) if (c.profileId === draft?.id) candidates.set(c.id, { id: c.id, name: c.moduleName });
  for (const c of draft?.semester.courses || []) candidates.set(c.id, c);
  return <details className={styles.settings}>
    <summary>{zh ? uiText("ui.schoolsettings.48e33321a5") : uiText("ui.schoolsettings.c1c79d9b3f")}</summary>
    <p>{zh ? uiText("ui.schoolsettings.37bc0dd1f2") : uiText("ui.schoolsettings.27797b8595")}</p>
    {draft && <form onSubmit={event => { event.preventDefault(); void submit(false); }}>
      <div className={styles.settingsGrid}>
        <label>{zh ? uiText("ui.schoolsettings.99d51fc6c0") : uiText("ui.schoolsettings.ae6c57f771")}<select value={known?.id || "new"} onChange={e => { choose(settings.profiles.find(p => p.id === e.target.value)); setCatalog([]); }}><option value="new">{zh ? uiText("ui.schoolsettings.478d048073") : uiText("ui.schoolsettings.edd013e203")}</option>{settings.profiles.map(p => <option key={p.id} value={p.id}>{p.school} · {p.domain}</option>)}</select></label>
        <label>{zh ? uiText("ui.schoolsettings.70cfa2025f") : uiText("ui.schoolsettings.8a8eee2bad")}<input required maxLength={160} value={draft.school} onChange={e => change({ school: e.target.value })} /></label>
        <label>{zh ? uiText("ui.schoolsettings.33ee248c6a") : uiText("ui.schoolsettings.95c8dc62b6")}<input required type="url" placeholder="https://school.example.edu/d2l/home" value={draft.entryUrl} onChange={e => change({ entryUrl: e.target.value })} /></label>
        <label>{zh ? uiText("ui.schoolsettings.910887705c") : uiText("school.platform")}<select value={draft.platform} onChange={e => change({ platform: e.target.value as ProfileInput["platform"] })}><option value="brightspace">Brightspace / PoliteMall</option><option value="unsupported">{zh ? uiText("ui.schoolsettings.d8a203eb91") : uiText("ui.schoolsettings.7375af527e")}</option></select></label>
      </div>
      <div className={styles.actions}>{[["Temasek Polytechnic", "https://tplms.polite.edu.sg/d2l/home"], ["Republic Polytechnic", "https://rplms.polite.edu.sg/d2l/home"]].map(([school, entryUrl]) => <button type="button" key={school} onClick={() => { const next = blank(); setDraft({ ...next, school, entryUrl }); setPreview(null); setCatalog([]); }}>{zh ? uiText("ui.schoolsettings.1b702059cf") : uiText("ui.schoolsettings.0f06f94cd2")}{school}</button>)}</div>
      <div className={styles.settingsGrid}>
        <label>{zh ? uiText("ui.schoolsettings.e71a15dcc2") : uiText("ui.schoolsettings.20dd06026e")}<select value={known?.semesters.some(s => s.id === draft.semester.id) ? draft.semester.id : "new"} onChange={e => change({ semester: known?.semesters.find(s => s.id === e.target.value) || { id: crypto.randomUUID(), label: "", confirmed: true, courses: [] } })}><option value="new">{zh ? uiText("ui.schoolsettings.6259925d8d") : uiText("school.newSemester")}</option>{known?.semesters.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label>{zh ? uiText("ui.schoolsettings.44538f19d0") : uiText("ui.schoolsettings.8f190cbc43")}<input required maxLength={160} placeholder={uiText("ui.schoolsettings.db394a8eba")} value={draft.semester.label} onChange={e => change({ semester: { ...draft.semester, label: e.target.value } })} /></label>
        <label>{zh ? uiText("ui.schoolsettings.53800e623f") : uiText("ui.schoolsettings.1fb8ac5d9b")}<input required type="time" value={draft.daily.time} onChange={e => change({ daily: { ...draft.daily, time: e.target.value } })} /></label>
        <label>{zh ? uiText("ui.schoolsettings.ed1e866360") : uiText("ui.schoolsettings.36724342ec")}<select value={draft.daily.timezone} onChange={e => change({ daily: { ...draft.daily, timezone: e.target.value as "Asia/Singapore" | "UTC" } })}><option>Asia/Singapore</option><option>UTC</option></select></label>
      </div>
      <fieldset><legend>{zh ? uiText("ui.schoolsettings.7ee26dcd29") : uiText("ui.schoolsettings.2636ccdac6")}</legend>
        {Array.from(candidates.values()).map(c => { const selected = draft.semester.courses.find(x => x.id === c.id); const edit = (update: Partial<ProfileInput["semester"]["courses"][number]>) => change({ semester: { ...draft.semester, courses: draft.semester.courses.filter(x => x.id !== c.id).concat({ id: c.id, name: c.name, selected: false, status: "active", ...selected, ...update }) } }); return <div key={c.id} className={styles.courseSetting}><label><input type="checkbox" checked={selected?.selected || false} onChange={e => edit({ selected: e.target.checked })} />{c.id} · {c.name}</label><select aria-label={uiText("school.courseStatus", { name: c.name })} value={selected?.status || "active"} onChange={e => edit({ status: e.target.value as "active" | "completed" | "paused" })}><option value="active">{zh ? uiText("ui.schoolsettings.0534b16cc8") : uiText("ui.schoolsettings.9234069589")}</option><option value="completed">{zh ? uiText("ui.schoolsettings.f28461bb49") : uiText("ui.schoolsettings.22a970d2e5")}</option><option value="paused">{zh ? uiText("ui.schoolsettings.8d12fc0d4e") : uiText("ui.schoolsettings.e159b06187")}</option></select></div>; })}
        <div className={styles.settingsGrid}><label>{zh ? uiText("ui.schoolsettings.4514b4f755") : uiText("ui.schoolsettings.be541c0783")}<input value={courseId} onChange={e => setCourseId(e.target.value)} /></label><label>{zh ? uiText("ui.schoolsettings.bd2d74b297") : uiText("ui.schoolsettings.1b40a15f07")}<input value={courseName} onChange={e => setCourseName(e.target.value)} /></label></div>
        <button type="button" disabled={!/^[a-zA-Z0-9_-]{1,100}$/.test(courseId) || !courseName.trim()} onClick={() => { change({ semester: { ...draft.semester, courses: draft.semester.courses.filter(c => c.id !== courseId).concat({ id: courseId, name: courseName.trim(), selected: true, status: "active" }) } }); setCourseId(""); setCourseName(""); }}>{zh ? uiText("ui.schoolsettings.1ebab46534") : uiText("ui.schoolsettings.458c5a9d57")}</button>
        <p>{zh ? uiText("ui.schoolsettings.1fccdd8200") : uiText("ui.schoolsettings.728ad69c07")}</p>
      </fieldset>
      <button type="submit" disabled={busy}>{busy ? (zh ? uiText("ui.schoolsettings.d3d21191f3") : uiText("school.working")) : (zh ? uiText("ui.schoolsettings.1110c1d030") : uiText("ui.schoolsettings.1b12f0cfad"))}</button>
      {preview && <div className={styles.notice}><div><strong>{preview.school} · {preview.domain}</strong><p>{preview.entryUrl}<br />{preview.semester.label} · {uiText("school.activeCourses", { count: preview.semester.courses.filter(c => c.selected && c.status === "active").length })}<br />{zh ? uiText("ui.schoolsettings.fd7b67c923") : uiText("ui.schoolsettings.b36c2611dc")} {preview.daily.time} ({preview.daily.timezone}) · {supportsSchoolConnection(preview.domain, preview.platform) ? "Brightspace" : (zh ? uiText("ui.schoolsettings.abedc40e84") : uiText("ui.schoolsettings.7bfb841de1"))}</p><button type="button" disabled={busy} onClick={() => void submit(true)}>{zh ? uiText("ui.schoolsettings.20be25ec9a") : uiText("ui.schoolsettings.f022e0234a")}</button></div></div>}
    </form>}
    <p role="status">{localizeExternal(message)}</p>
    <p>{zh ? uiText("ui.schoolsettings.b42e5553dc") : uiText("ui.schoolsettings.caabca52af")}</p>
    <p>{zh ? uiText("ui.schoolsettings.da580ed29e") : uiText("ui.schoolsettings.3340cb2339")}</p>
    <a href="/api/lms/settings?export=1" download>{zh ? uiText("ui.schoolsettings.649db6c9db") : uiText("ui.schoolsettings.3dd7932ba8")}</a>
    <p>{zh ? uiText("ui.schoolsettings.cc8d6dd0be") : uiText("ui.schoolsettings.ce59348195")}</p>
  </details>;
}
