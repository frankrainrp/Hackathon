"use client";
import { localizeExternal, stateLabel } from "@/lib/messages";
import { appFetch as fetch } from "@/lib/messages";

import { uiText } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Cloud, Cpu, Download, Pause, Play, RefreshCw, Settings2, Square, X } from "lucide-react";
import type { AiSettings } from "@/lib/ai-config";
import type { CatalogModel, HardwareSummary } from "@/lib/ai-catalog";
import { recommendations, modelAvailability } from "@/lib/ai-catalog";
import { contextPlan, estimatedModelGiB } from "@/lib/ai-context";
import type { DownloadStatus } from "@/lib/ai-download";
import styles from "./AiSetup.module.css";

type Engine = { state: string; error?: string; model?: string; modelName?: string | null; context?: number; url: string };
type Snapshot = { defaultModelsDir: string; memory: { ramGiB: number; freeRamGiB: number }; settings: AiSettings; catalog: CatalogModel[]; catalogVersion: string; downloads: DownloadStatus[]; engine: Engine; keyPresent: boolean; protectedStorage: boolean; legacyAvailable: boolean };
type Advice = ReturnType<typeof recommendations>;
const TITLES = () => [uiText("ui.aisetup.55b34f7a67"), uiText("ui.aisetup.900d603e31"), uiText("ui.aisetup.3535b67e2d"), uiText("ui.aisetup.00d1fd3c24")];
async function request(action?: string, data: Record<string, unknown> = {}) {
  const response = await fetch("/api/ai/setup", action ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }), cache: "no-store" } : { cache: "no-store" });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || uiText("ui.aisetup.dd30b1d7ce"));
  if (action === "save" || action === "models" && result.settings) window.dispatchEvent(new CustomEvent("butler:ai-settings-change"));
  return result;
}
export default function AiSetupGate({ standalone = false }: { standalone?: boolean }) {
  const uiLanguage = useCopyLanguage().lang;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [open, setOpen] = useState(standalone), [loadError, setLoadError] = useState("");
  const refresh = useCallback(async () => { try { const s = await request(); setSnapshot(s); setLoadError(""); return s as Snapshot; } catch (e) { setLoadError((e as Error).message); return null; } }, []);
  useEffect(() => { let live = true; void refresh().then(s => { if (live && s?.settings.onboarding === "new") setOpen(true); }); return () => { live = false; }; }, [refresh]);
  useEffect(() => { const show = () => { void refresh().then(() => setOpen(true)); }; window.addEventListener("butler:ai-setup", show); return () => window.removeEventListener("butler:ai-setup", show); }, [refresh]);
  const close = async () => { setOpen(false); await refresh(); if (standalone) window.location.assign("/"); };
  return <>
    {loadError && !open && <div className={styles.resume} role="status"><span>{localizeExternal(loadError)}</span><button onClick={() => { setOpen(true); void refresh(); }}>{uiText("ui.aisetup.5e2eb57930")}</button></div>}
    {!open && snapshot?.settings.onboarding === "paused" && <button className={styles.resume} onClick={() => setOpen(true)}><Settings2 size={16} />{uiText("ui.aisetup.4ab6daeb5c")}</button>}
    {open && (snapshot ? <AiSetup initial={snapshot} onClose={close} /> : <div className={styles.overlay}><section className={styles.loading} role="status"><h1>{uiText("ui.aisetup.2063531272")}</h1><p>{loadError || uiText("ui.aisetup.bd4f206620")}</p><button onClick={() => void refresh()}>{uiText("ui.aisetup.942087cc2d")}</button><button onClick={() => void close()}>{uiText("ui.aisetup.0bad8c58b7")}</button></section></div>)}
  </>;
}
function AiSetup({ initial, onClose }: { initial: Snapshot; onClose: () => Promise<void> }) {
  const { lang: uiLanguage, setLang } = useCopyLanguage();
  const [s, setS] = useState(initial.settings), [status, setStatus] = useState(initial);
  const [hardware, setHardware] = useState<HardwareSummary | null>(null), [advice, setAdvice] = useState<Advice | null>(null), [probe, setProbe] = useState<{ available: boolean; version: string; error?: string } | null>(null);
  const [files, setFiles] = useState<{ filename: string; id: string; bytes: number }[]>([]), [models, setModels] = useState<string[]>([]);
  const [folder, setFolder] = useState(s.modelsDir), [key, setKey] = useState(""), [busy, setBusy] = useState(""), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [sample, setSample] = useState(""), [sampleConsent, setSampleConsent] = useState(false), [downloadConsent, setDownloadConsent] = useState(false), [tested, setTested] = useState(false);
  const panel = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null), latest = useRef(s);
  latest.current = s;
  const update = (patch: Partial<AiSettings>) => { setS(current => ({ ...current, ...patch })); setTested(false); setSample(""); setMessage(""); };
  const save = async (next = latest.current) => { const result = await request("save", { settings: next }); setS(result.settings); latest.current = result.settings; };
  const run = async (name: string, fn: () => Promise<void>) => { if (busy) return; setBusy(name); setError(""); setMessage(""); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(""); } };
  const refresh = useCallback(async () => { const next = await request(); setStatus(next); }, []);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; heading.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); panel.current?.querySelector<HTMLButtonElement>('[data-pause]')?.click(); }
      if (event.key === "Tab") {
        const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary') || []).filter(n => n.getClientRects().length);
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); before?.focus(); };
  }, []);
  useEffect(() => { heading.current?.focus(); }, [s.step]);
  const active = status.downloads.some(d => ["downloading", "verifying"].includes(d.state)) || status.engine.state === "starting";
  useEffect(() => { if (!active) return; const timer = window.setInterval(() => { void refresh().catch(() => {}); }, 1000); return () => clearInterval(timer); }, [active, refresh]);
  const pause = () => run("pause", async () => { await save({ ...s, onboarding: "paused" }); setKey(""); await onClose(); });
  const choose = (mode: AiSettings["mode"]) => run("choose", async () => { await save({ ...s, mode, step: 1 }); });
  const inspect = (includeGpu = true) => run("hardware", async () => { await save(); const result = await request("hardware", { includeGpu }); setHardware(result.hardware); setAdvice(result.recommendations); setProbe(result.probe); setFiles(result.models); if (!status.catalog.some(m => m.id === latest.current.modelId) && status.engine.state !== "ready" && result.recommendations.quality) { const model = status.catalog.find(m => m.id === result.recommendations.quality)!; await save({ ...latest.current, modelId: model.id, context: contextPlan(model, result.hardware).recommended, contextMode: "auto" }); } setMessage(uiText("ui.aisetup.4fc47c91d8")); });
  const selected = status.catalog.find(m => m.id === s.modelId);
  const displayAdvice = hardware ? recommendations(hardware, s.contextMode === "manual" ? s.context : undefined) : advice;
  const plan = selected ? contextPlan(selected, hardware || status.memory) : null;
  const scanKey = useRef("");
  useEffect(() => {
    if (busy || !(s.step === 0 || (s.step === 1 && s.mode === "local" && s.localKind === "bundled"))) return;
    const key = s.modelsDir;
    if (scanKey.current === key) return;
    scanKey.current = key; void inspect(false);
  }, [s.step, s.mode, s.localKind, s.modelsDir, busy]);
  const selectedDownload = status.downloads.find(d => d.id === s.modelId && d.directory.toLowerCase() === s.modelsDir.toLowerCase());
  const bundled = s.mode === "local" && s.localKind === "bundled";
  const next = () => run("next", async () => { await save({ ...s, step: Math.min(3, s.step + 1) }); });
  return <div className={styles.overlay}>
    <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="ai-setup-title" aria-describedby="ai-setup-description">
      <header className={styles.header}>
        <span className={styles.brand}><Settings2 size={18} />{uiText("ui.aisetup.831937ecf3")}</span>
        <div className={styles.headerActions}><select aria-label={uiText("prefs.section.language")} value={uiLanguage} onChange={e => setLang(e.target.value as "en" | "zh")}><option value="en">English</option><option value="zh">中文</option></select><button data-pause className={styles.quiet} onClick={pause} disabled={!!busy} aria-label={uiText("ui.aisetup.09b0beef85")}><X size={20} /></button></div>
      </header>
      <div className={styles.layout}>
        <aside className={styles.steps} aria-label={uiText("ui.aisetup.e9b4495ace")}>
          {[uiText("ui.aisetup.c7f937836f"), uiText("ui.aisetup.ee820467e9"), uiText("ui.aisetup.532eaabd95"), uiText("ui.aisetup.c36d819e7b")].map((name, i) => <button key={name} aria-current={s.step === i ? "step" : undefined} disabled={!!busy || i > s.step} onClick={() => void run("step", () => save({ ...s, step: i }))}><span>{i < s.step ? <CheckCircle2 size={17} /> : i + 1}</span>{name}</button>)}
          <p>{uiText("ui.aisetup.4646090c5c")}</p>
        </aside>
        <main className={styles.main}>
          <h1 id="ai-setup-title" ref={heading} tabIndex={-1}>{TITLES()[s.step]}</h1>
          <p id="ai-setup-description" className={styles.intro}>{s.step === 0 ? uiText("ui.aisetup.9c4afbfafa") : s.step === 1 ? uiText("ui.aisetup.47c571ae1e") : s.step === 2 ? uiText("ui.aisetup.85116cfd7a") : uiText("ui.aisetup.2bf9ca2d96")}</p>
          {s.step === 0 && <>
            <p role="status" className={styles.feedback}>{hardware && displayAdvice ? uiText(displayAdvice.recommendedMode === "api" ? "ai.curated.apiReason" : "ai.curated.deviceReady", { model: status.catalog.find(m => m.id === displayAdvice.quality)?.label || "" }) : uiText("ai.curated.scanning")}</p>
            <div className={styles.choices}>
              <button disabled={!!busy} onClick={() => choose("local")} aria-describedby="local-choice-advice"><Cpu size={25} /><strong>{uiText("ui.aisetup.3196b928eb")}</strong><span id="local-choice-advice">{displayAdvice?.recommendedMode === "api" ? uiText("ai.curated.localUnavailable") : uiText("ui.aisetup.ef05d2a558")}</span><span className={styles.choiceAction}>{uiText("ui.aisetup.243f4098cb")}<ArrowRight size={16} /></span></button>
              <button disabled={!!busy} onClick={() => choose("deepseek")}><Cloud size={25} /><strong>{uiText("ui.aisetup.8b161ecc9d")}</strong><span>{uiText("ui.aisetup.6c74a96a84")}</span><span className={styles.choiceAction}>{uiText("ui.aisetup.d8257de63c")}<ArrowRight size={16} /></span></button>
            </div>
            {status.legacyAvailable && <p><button className={styles.textButton} disabled={!!busy} onClick={() => choose("legacy")}>{uiText("ui.aisetup.7d24c5d979")}</button>{uiText("ui.aisetup.0280d58e89")}</p>}
            <p><button className={styles.textButton} disabled={!!busy} onClick={() => void run("turn-off", async () => { await save({ ...s, mode: "none", onboarding: "complete", step: 0 }); setKey(""); await onClose(); })}>{uiText("ui.aisetup.2375e0261d")}</button></p>
            <p className={styles.hint}>{uiText("ui.aisetup.c0544b7a02")}</p>
          </>}
          {s.step === 1 && <>
            {s.mode === "local" && <>
              <fieldset className={styles.fieldset}><legend>{uiText("ui.aisetup.6a85818a02")}</legend><label><input type="radio" name="engine" checked={s.localKind === "bundled"} onChange={() => update({ localKind: "bundled" })} />{uiText("ui.aisetup.fab2843b94")}</label><label><input type="radio" name="engine" checked={s.localKind === "external"} onChange={() => update({ localKind: "external" })} />{uiText("ui.aisetup.89430aabae")}</label></fieldset>
              {s.localKind === "bundled" ? <>
                <div className={styles.row}><button disabled={!!busy} onClick={() => void inspect()}><Cpu size={16} />{uiText("ai.device.recheck")}</button><span className={styles.hint}>{uiText("ui.aisetup.d321cb9236")}</span></div>
                {hardware && <section className={styles.computer} aria-label={uiText("ui.aisetup.24fe4e1099")}><dl><div><dt>{uiText("ui.aisetup.6725e7bbcd")}</dt><dd>{hardware.os} · {hardware.arch}</dd></div><div><dt>{uiText("ui.aisetup.85b67e04a3")}</dt><dd>{uiText("ui.aisetup.c9d150ae33", { value0: hardware.freeRamGiB.toFixed(1), value1: hardware.ramGiB.toFixed(1) })}</dd></div><div><dt>{uiText("ui.aisetup.c9e5f56a8f")}</dt><dd>{hardware.diskGiB === null ? uiText("ui.aisetup.b764cdc0ea") : uiText("ai.diskFree", { size: hardware.diskGiB.toFixed(1) })}</dd></div><div><dt>CPU</dt><dd>{hardware.cpu ? uiText("ai.device.cpu", { name: hardware.cpu.name, count: hardware.cpu.logicalCores }) : "—"}</dd></div><div><dt>GPU</dt><dd>{hardware.gpuChecked === false ? uiText("ai.device.cpuOnly") : hardware.gpus.length ? hardware.gpus.map(g => `${g.name} (${g.vramGiB === null ? uiText("ui.aisetup.3786b6e749") : g.vramGiB.toFixed(1) + " GiB"})`).join(", ") : uiText("ui.aisetup.9f4a106271")}</dd></div></dl><p>{localizeExternal(displayAdvice?.backend)}</p><p>{probe?.available ? uiText("ui.aisetup.4b9ba7ac50", { value0: probe.version }) : localizeExternal(probe?.error || "")}</p></section>}
                <label className={styles.field}>{uiText("ui.aisetup.aeada21c12")}<input value={folder} onChange={e => setFolder(e.target.value)} spellCheck={false} /></label>
                <div className={styles.row}><button disabled={!!busy} onClick={() => void run("folder", async () => { await save(); const result = await request("folder", { directory: folder }); setS(result.settings); latest.current = result.settings; setHardware(null); setAdvice(null); setFolder(result.directory); setFiles(result.models); await refresh(); setMessage(uiText("ui.aisetup.7a92e24a7d")); })}>{uiText("ui.aisetup.30cbaeca91")}</button><button disabled={!!busy} onClick={() => void run("folder", async () => { await save(); const result = await request("folder", { useDefault: true }); setS(result.settings); latest.current = result.settings; setFolder(result.directory); setFiles(result.models); setHardware(null); setAdvice(null); scanKey.current = ""; await refresh(); })}>{uiText("ai.folder.reset")}</button><span className={styles.hint}>{uiText("ui.aisetup.0a09295570")}</span></div><p className={styles.pathHint}>{uiText(s.modelsDirMode === "auto" ? "ai.folder.automatic" : "ai.folder.custom")}<br />{s.modelsDir}</p>
                <label className={styles.field}>{uiText("ui.aisetup.a38d30047c")}<select disabled={!selected || !!busy} value={s.contextMode === "auto" ? "auto" : s.context} onChange={e => update(e.target.value === "auto" ? { contextMode: "auto", context: plan!.recommended } : { contextMode: "manual", context: Number(e.target.value) })}><option value="auto">{uiText("ai.context.auto", { size: plan?.recommended || s.context })}</option>{plan?.options.map(size => <option key={size} value={size} disabled={!plan.available.includes(size)}>{uiText("ai.context.option", { size })}</option>)}</select><small>{selected && plan ? uiText("ai.context.detail", { model: selected.label, max: plan.max, size: s.contextMode === "auto" ? plan.recommended : s.context, memory: estimatedModelGiB(selected, s.contextMode === "auto" ? plan.recommended : s.context).toFixed(1) }) : uiText("ai.context.choose")}</small></label>
                {displayAdvice && <div className={styles.advice}><h2>{uiText(displayAdvice.recommendedMode === "api" ? "ai.curated.apiTitle" : "ai.model.recommendation")}</h2><p>{uiText("ai.curated.selectionHelp")}</p>{displayAdvice.recommendedMode === "api" && <button disabled={!!busy} onClick={() => choose("deepseek")}><Cloud size={16} />{uiText("ai.curated.openApi")}</button>}<p><strong>{uiText("ui.aisetup.9eed15f3cf")}</strong>{localizeExternal(displayAdvice.qualityReason)}</p><p><strong>{uiText("ui.aisetup.7231c90b01")}</strong>{localizeExternal(displayAdvice.balancedReason)}</p><small>{uiText("ui.aisetup.fce15122b2", { value0: status.catalogVersion })}</small></div>}
                <p className={styles.hint}>{uiText("ai.curated.evidenceDisclaimer")}</p>{s.modelId && !selected && <p className={styles.feedback}>{uiText("ai.curated.retired")}</p>}<fieldset className={styles.fieldset}><legend>{uiText("ui.aisetup.44d667fb5f")}</legend>{status.catalog.map(model => <label key={model.id} className={styles.model}><input type="radio" name="model" checked={s.modelId === model.id} disabled={!!busy || !hardware || !modelAvailability(model, hardware).available} onChange={() => { const nextPlan = contextPlan(model, hardware); update({ modelId: model.id, contextMode: "auto", context: nextPlan.recommended }); setDownloadConsent(false); }} /><span><strong>{model.label}</strong><span>{uiText("ui.aisetup.382f5aa32d", { value0: (model.bytes / 1e9).toFixed(2), value1: model.license })}{displayAdvice?.quality === model.id ? uiText("ai.qualityBadge") : ""}{displayAdvice?.balanced === model.id ? uiText("ai.balancedBadge") : ""}</span><span>{localizeExternal(model.capability)}</span><small>{localizeExternal(model.limitations)}</small>{hardware && <small>{modelAvailability(model, hardware).available ? uiText("ai.model.ready", { size: contextPlan(model, hardware).recommended }) : modelAvailability(model, hardware).reasons.join(" · ")}</small>}<a href={model.source} target="_blank" rel="noreferrer">{uiText("ui.aisetup.0523bd2244")}</a>{model.evidence && <a href={model.evidence.evaluation} target="_blank" rel="noreferrer">{uiText("ai.curated.evidence", { date: model.evidence.reviewed })}</a>}</span></label>)}</fieldset>
                {files.length > 0 && <details><summary>{uiText("ui.aisetup.c022cb19cc", { value0: files.length })}</summary>{files.map(f => <p key={f.filename}>{uiText("ui.aisetup.bc3d2c963a", { value0: f.filename, value1: (f.bytes / 1e9).toFixed(2) })}{!f.id && uiText("ai.outsideCatalog")}</p>)}<p>{uiText("ui.aisetup.3eb08fa24a")}</p></details>}
                {selected && <section className={styles.download} aria-label={uiText("ui.aisetup.a082359dbe")}><h2>{selected.label}</h2><p>{uiText("ui.aisetup.a2ab031d51", { value0: (selected.bytes / 1e9).toFixed(2), value1: selected.license })}</p><label><input type="checkbox" checked={downloadConsent} onChange={e => setDownloadConsent(e.target.checked)} />{uiText("ui.aisetup.7dc5213294")}</label><div className={styles.row}><button disabled={!!busy || !downloadConsent || status.downloads.some(d => ["downloading", "verifying"].includes(d.state))} onClick={() => void run("download", async () => { await save(); await request("download", { id: selected.id, confirm: downloadConsent }); await refresh(); })}><Download size={16} /> {selectedDownload?.received ? uiText("ui.aisetup.167bedb594") : uiText("ui.aisetup.2e917d439f")}</button></div>
                  {selectedDownload && <><progress aria-label={uiText("ui.aisetup.273d2f85e0")} value={selectedDownload.received} max={selectedDownload.total} /><p className={styles.progressText}>{uiText("ui.aisetup.e0a43ca4a5", { value0: stateLabel(selectedDownload.state), value1: (selectedDownload.received / 1e9).toFixed(2), value2: (selectedDownload.total / 1e9).toFixed(2) })}</p>{selectedDownload.error && <p>{localizeExternal(selectedDownload.error)}</p>}{["downloading", "verifying"].includes(selectedDownload.state) && <button disabled={!!busy} onClick={() => void run("cancel", async () => { await request("cancel", { id: selected.id }); await refresh(); })}><Pause size={16} />{uiText("ui.aisetup.c026381496")}</button>}</>}
                  <details><summary>{uiText("ui.aisetup.62835bcdeb")}</summary><p>{uiText("ui.aisetup.ab9344131b", { value0: selected.revision })}</p><p className={styles.hash}>{uiText("ui.aisetup.c622a6e01d", { value0: selected.sha256 })}</p></details>
                </section>}
                <div className={styles.row}><button disabled={!!busy || !s.modelId || !hardware || !!(selected && !modelAvailability(selected, hardware, s.contextMode === "auto" ? plan?.recommended : s.context).available) || ["starting", "ready"].includes(status.engine.state)} onClick={() => void run("start", async () => { await save(); await request("start"); await refresh(); })}><Play size={16} />{uiText("ui.aisetup.a9e298dc77")}</button><button disabled={!!busy || status.engine.state === "stopped"} onClick={() => void run("stop", async () => { await request("stop"); await refresh(); })}><Square size={16} />{uiText("ui.aisetup.e9d14435f6")}</button><span role="status">{uiText("ui.aisetup.99b2eb1dc2", { value0: stateLabel(status.engine.state) })}</span></div>{status.engine.error && <p className={styles.error}>{localizeExternal(status.engine.error)}</p>}
                <p className={styles.hint}>{uiText("ui.aisetup.ac7ed6fe4e")}</p>
              </> : <>
                <label className={styles.field}>{uiText("ui.aisetup.4978763040")}<input value={s.externalURL} onChange={e => update({ externalURL: e.target.value })} spellCheck={false} /><small>{uiText("ui.aisetup.a85170b9fe")}</small></label>
                <button disabled={!!busy} onClick={() => void run("models", async () => { await save(); const result = await request("models"); setModels(result.models); setS(result.settings); latest.current = result.settings; setMessage(uiText("ai.modelsFound", { count: result.models.length })); })}><RefreshCw size={16} />{uiText("ui.aisetup.49f5c4c6f8")}</button>
                <label className={styles.field}>{uiText("ui.aisetup.1fc190413f")}<select value={s.externalModel} onChange={e => update({ externalModel: e.target.value })}><option value="">{uiText("ui.aisetup.78a7ab5e31")}</option>{Array.from(new Set([...models, ...(s.externalModel ? [s.externalModel] : [])])).map(id => <option key={id}>{id}</option>)}</select></label><p>{uiText("ui.aisetup.d04a0e8319")}</p>
              </>}
            </>}
            {s.mode === "deepseek" && <>
              <ol className={styles.instructions}><li>{uiText("ui.aisetup.aa103a65a8")}<a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">{uiText("ui.aisetup.0d53f5c9a9")}</a>{uiText("ui.aisetup.61715d51fc")}</li><li>{uiText("ui.aisetup.99336d34ab")}</li><li>{uiText("ui.aisetup.a41829d212")}</li></ol>
              <label className={styles.field}>{uiText("ui.aisetup.16f0ee47f9")}<input type="password" value={key} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder={status.keyPresent ? uiText("ai.keyReplacement") : uiText("ui.aisetup.084887c35e")} /><small>{uiText("ui.aisetup.4e0aa7ff07")}</small></label>
              <div className={styles.row}><button disabled={!!busy || !key || !status.protectedStorage} onClick={() => void run("save-key", async () => { const transient = key; setKey(""); await request("save-key", { key: transient }); await save(); await refresh(); setMessage(uiText("ui.aisetup.cacfe55273")); })}>{uiText("ui.aisetup.abaa8bd7b7")}</button><button disabled={!!busy || !status.keyPresent} onClick={() => void run("delete-key", async () => { await request("delete-key"); setKey(""); setTested(false); await refresh(); setMessage(uiText("ui.aisetup.59a416fef7")); })}>{uiText("ui.aisetup.946b51ef67")}</button><span>{status.keyPresent ? uiText("ui.aisetup.a45a97cbb7") : uiText("ui.aisetup.fd4c4f2ca0")}</span></div>
              {!status.protectedStorage && <p className={styles.error}>{uiText("ui.aisetup.a6d5af7a3a")}</p>}
              <label className={styles.field}>{uiText("ui.aisetup.ce73e6c90b")}<select value={s.deepseekModel} onChange={e => update({ deepseekModel: e.target.value as AiSettings["deepseekModel"] })}><option value="deepseek-flash">{uiText("ui.aisetup.695a306e2d")}</option><option value="deepseek-v4-pro">{uiText("ui.aisetup.2dc48bbf58")}</option></select></label><p>{uiText("ui.aisetup.4c19f3b54b")}<code>https://api.deepseek.com</code>{uiText("ui.aisetup.9c005b6c57", { version: status.catalogVersion })}<a href="https://api-docs.deepseek.com/" target="_blank" rel="noreferrer">{uiText("ui.aisetup.f9101a227e")}</a></p>
              <p className={styles.hint}>{uiText("ui.aisetup.4e4cb2ed27")}</p>
            </>}
            {s.mode === "legacy" && <p>{uiText("ui.aisetup.e0365cdb2d")}</p>}
          </>}
          {s.step === 2 && <>
            <div className={styles.connection}><h2>{s.mode === "deepseek" ? uiText("ui.aisetup.8b161ecc9d") : bundled ? uiText("ui.aisetup.e01271bfea") : uiText("ui.aisetup.481e12e1df")}</h2><p>{s.mode === "deepseek" ? s.deepseekModel : bundled ? status.engine.modelName || selected?.file || uiText("ai.chooseInPrepare") : s.externalModel || uiText("ui.aisetup.9c35e10161")}</p><p>{uiText("ui.aisetup.85ad3ffac8")}</p></div>
            <button disabled={!!busy} onClick={() => void run("test", async () => { await save(); const result = await request("test"); setTested(true); setMessage(result.message); })}><RefreshCw size={16} />{uiText("ui.aisetup.5bcf311b19")}</button>
            <label className={styles.consent}><input type="checkbox" checked={sampleConsent} onChange={e => setSampleConsent(e.target.checked)} />{uiText("ui.aisetup.25283bc0f6")}{s.mode === "deepseek" && uiText("ui.aisetup.0a4a9128bd")}</label>
            <button disabled={!!busy || !tested || !sampleConsent} onClick={() => void run("sample", async () => { await save(); const result = await request("sample", { confirm: sampleConsent }); setSample(result.sample); setMessage(result.message); })}>{uiText("ui.aisetup.400d156107")}</button>
            {sample && <section className={styles.sample}><h2>{uiText("ui.aisetup.26f649feaf")}</h2><p>{sample}</p><small>{uiText("ui.aisetup.071d51d07b")}</small></section>}
            <OcrChoice checked={s.cloudOcr} onChange={value => update({ cloudOcr: value })} />
          </>}
          {s.step === 3 && <>
            <div className={styles.success}><CheckCircle2 size={28} /><h2>{sample ? uiText("ui.aisetup.381d151e74") : uiText("ui.aisetup.80c6d099d4")}</h2><p>{sample ? uiText("ai.tryQuestion") : uiText("ui.aisetup.92cdec0eae")}</p></div>
            <ol className={styles.instructions}><li>{uiText("ui.aisetup.f0a9bc683a")}</li><li>{uiText("ui.aisetup.f1b4b1b5cf")}</li><li>{uiText("ui.aisetup.06c7e77461")}</li></ol>
            <p>{uiText("ui.aisetup.701deffe09")}</p>
            <OcrChoice checked={s.cloudOcr} onChange={value => update({ cloudOcr: value })} />
          </>}
          <div aria-live="polite" aria-atomic="true">{busy && <p className={styles.feedback}>{uiText("ui.aisetup.f18b905711", { value0: stateLabel(busy) })}</p>}{message && <p className={styles.feedback}>{localizeExternal(message)}</p>}</div>
          {error && <div className={styles.error} role="alert"><strong>{uiText("ui.aisetup.4cafc5bfc8")}</strong><p>{localizeExternal(error)}</p><p>{uiText("ui.aisetup.11db1756ee")}</p></div>}
          <details className={styles.help}><summary>{uiText("ui.aisetup.ddea7a6deb")}</summary><dl><dt>{uiText("ui.aisetup.914df34bb0")}</dt><dd>{uiText("ui.aisetup.e2c7b8bba7")}</dd><dt>{uiText("ui.aisetup.d7736c3e05")}</dt><dd>{uiText("ui.aisetup.dec6e7b8ce")}</dd><dt>{uiText("ui.aisetup.32ec149b1f")}</dt><dd>{uiText("ui.aisetup.386a0d1001")}</dd><dt>{uiText("ui.aisetup.2cde9b0835")}</dt><dd>{uiText("ui.aisetup.a89a24cbed")}</dd><dt>{uiText("ui.aisetup.f95af4372c")}</dt><dd>{uiText("ui.aisetup.3b61e52184")}</dd></dl></details>
        </main>
      </div>
      <footer className={styles.footer}><button className={styles.quiet} disabled={!!busy} onClick={pause}>{uiText("ui.aisetup.761f3d77f1")}</button><div className={styles.row}>{s.step > 0 && <button disabled={!!busy} onClick={() => void run("back", () => save({ ...s, step: s.step - 1 }))}><ArrowLeft size={16} />{uiText("ui.aisetup.76900f1bfd")}</button>}{s.step > 0 && s.step < 3 && <button className={styles.primary} disabled={!!busy} onClick={next}>{s.step === 1 ? uiText("ui.aisetup.91efe7b337") : sample ? uiText("ui.aisetup.31fbef1625") : uiText("ui.aisetup.706a7e4391")}<ArrowRight size={16} /></button>}{s.step === 3 && <button className={styles.primary} disabled={!!busy} onClick={() => void run("finish", async () => { await save({ ...s, onboarding: "complete" }); setKey(""); await onClose(); })}>{uiText("ui.aisetup.554667bbe7")}<ArrowRight size={16} /></button>}</div></footer>
    </div>
  </div>;
}
function OcrChoice({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const uiLanguage = useCopyLanguage().lang;
  return <section className={styles.ocr}><h2>{uiText("ui.aisetup.ae17e8b6ff")}</h2><p>{uiText("ui.aisetup.68f73f9395")}</p><label><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />{uiText("ui.aisetup.a48ab5d0e6")}</label><p><small>{uiText("ui.aisetup.0ba6c565d4")}</small></p></section>;
}
