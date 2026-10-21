"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Cloud, Cpu, Download, Pause, Play, RefreshCw, Settings2, Square, X } from "lucide-react";
import type { AiSettings } from "@/lib/ai-config";
import type { CatalogModel, HardwareSummary } from "@/lib/ai-catalog";
import type { DownloadStatus } from "@/lib/ai-download";
import styles from "./AiSetup.module.css";

type Engine = { state: string; error?: string; model?: string; context?: number; url: string };
type Snapshot = { settings: AiSettings; catalog: CatalogModel[]; catalogVersion: string; downloads: DownloadStatus[]; engine: Engine; keyPresent: boolean; protectedStorage: boolean; legacyAvailable: boolean };
type Advice = { quality: string | null; balanced: string | null; qualityReason: string; balancedReason: string; backend: string; unknown: boolean };
const TITLES = ["Choose your AI", "Prepare your connection", "Try it safely", "Ready for your next lesson"];
async function request(action?: string, data: Record<string, unknown> = {}) {
  const response = await fetch("/api/ai/setup", action ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }), cache: "no-store" } : { cache: "no-store" });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || "The setup service could not respond. Retry; your study data is separate.");
  return result;
}
export default function AiSetupGate({ standalone = false }: { standalone?: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [open, setOpen] = useState(standalone), [loadError, setLoadError] = useState("");
  const refresh = useCallback(async () => { try { const s = await request(); setSnapshot(s); setLoadError(""); return s as Snapshot; } catch (e) { setLoadError((e as Error).message); return null; } }, []);
  useEffect(() => { let live = true; void refresh().then(s => { if (live && s?.settings.onboarding === "new") setOpen(true); }); return () => { live = false; }; }, [refresh]);
  useEffect(() => { const show = () => { void refresh().then(() => setOpen(true)); }; window.addEventListener("butler:ai-setup", show); return () => window.removeEventListener("butler:ai-setup", show); }, [refresh]);
  const close = async () => { setOpen(false); await refresh(); if (standalone) window.location.assign("/"); };
  return <>
    {loadError && !open && <div className={styles.resume} role="status"><span>{loadError}</span><button onClick={() => { setOpen(true); void refresh(); }}>Retry AI setup</button></div>}
    {!open && snapshot?.settings.onboarding === "paused" && <button className={styles.resume} onClick={() => setOpen(true)}><Settings2 size={16} /> Resume AI setup</button>}
    {open && (snapshot ? <AiSetup initial={snapshot} onClose={close} /> : <div className={styles.overlay}><section className={styles.loading} role="status"><h1>AI setup</h1><p>{loadError || "Loading your saved setup…"}</p><button onClick={() => void refresh()}>Retry</button><button onClick={() => void close()}>Continue without AI</button></section></div>)}
  </>;
}
function AiSetup({ initial, onClose }: { initial: Snapshot; onClose: () => Promise<void> }) {
  const [s, setS] = useState(initial.settings), [status, setStatus] = useState(initial);
  const [hardware, setHardware] = useState<HardwareSummary | null>(null), [advice, setAdvice] = useState<Advice | null>(null), [probe, setProbe] = useState<{ available: boolean; version: string; error?: string } | null>(null);
  const [files, setFiles] = useState<{ filename: string; id: string; bytes: number }[]>([]), [models, setModels] = useState<string[]>([]);
  const [folder, setFolder] = useState(s.modelsDir), [key, setKey] = useState(""), [busy, setBusy] = useState(""), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [sample, setSample] = useState(""), [sampleConsent, setSampleConsent] = useState(false), [downloadConsent, setDownloadConsent] = useState(false), [tested, setTested] = useState(false);
  const panel = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null), latest = useRef(s);
  latest.current = s;
  const update = (patch: Partial<AiSettings>) => { setS(current => ({ ...current, ...patch })); setTested(false); setSample(""); setMessage(""); };
  const save = async (next = latest.current) => { await request("save", { settings: next }); setS(next); latest.current = next; };
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
  const inspect = () => run("hardware", async () => { await save(); const result = await request("hardware"); setHardware(result.hardware); setAdvice(result.recommendations); setProbe(result.probe); setFiles(result.models); setMessage("Computer check complete. Nothing was uploaded."); });
  const selected = status.catalog.find(m => m.id === s.modelId);
  const selectedDownload = status.downloads.find(d => d.id === s.modelId && d.directory.toLowerCase() === s.modelsDir.toLowerCase());
  const bundled = s.mode === "local" && s.localKind === "bundled";
  const next = () => run("next", async () => { await save({ ...s, step: Math.min(3, s.step + 1) }); });
  return <div className={styles.overlay}>
    <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="ai-setup-title" aria-describedby="ai-setup-description">
      <header className={styles.header}>
        <span className={styles.brand}><Settings2 size={18} /> Butler · AI setup</span>
        <button data-pause className={styles.quiet} onClick={pause} disabled={!!busy} aria-label="Save progress and close AI setup"><X size={20} /></button>
      </header>
      <div className={styles.layout}>
        <aside className={styles.steps} aria-label="Setup progress">
          {["Choose", "Prepare", "Test", "Use"].map((name, i) => <button key={name} aria-current={s.step === i ? "step" : undefined} disabled={!!busy || i > s.step} onClick={() => void run("step", () => save({ ...s, step: i }))}><span>{i < s.step ? <CheckCircle2 size={17} /> : i + 1}</span>{name}</button>)}
          <p>You can stop here and come back. Courses, tasks and notes work without AI.</p>
        </aside>
        <main className={styles.main}>
          <h1 id="ai-setup-title" ref={heading} tabIndex={-1}>{TITLES[s.step]}</h1>
          <p id="ai-setup-description" className={styles.intro}>{s.step === 0 ? "Get help explaining lessons and organizing your work. Choose where that help runs." : s.step === 1 ? "Prepare one connection. Your saved courses and semester history stay in place." : s.step === 2 ? "Check the connection, then send a small example before using your own material." : "Your connection is saved. Start with one small question and review the answer."}</p>
          {s.step === 0 && <>
            <div className={styles.choices}>
              <button disabled={!!busy} onClick={() => choose("local")}><Cpu size={25} /><strong>Local on this computer</strong><span>Runs text AI on your computer. Download a model once, then use it offline. Needs free RAM and disk space.</span><span className={styles.choiceAction}>Set up Local <ArrowRight size={16} /></span></button>
              <button disabled={!!busy} onClick={() => choose("deepseek")}><Cloud size={25} /><strong>DeepSeek API</strong><span>Uses DeepSeek over the internet. You supply your own API key. Prompts are sent to DeepSeek and usage may cost money.</span><span className={styles.choiceAction}>Set up DeepSeek <ArrowRight size={16} /></span></button>
            </div>
            {status.legacyAvailable && <p><button className={styles.textButton} disabled={!!busy} onClick={() => choose("legacy")}>Keep my configured primary / alternate services</button> · May use your configured network server.</p>}
            <p><button className={styles.textButton} disabled={!!busy} onClick={() => void run("turn-off", async () => { await save({ ...s, mode: "none", onboarding: "complete", step: 0 }); setKey(""); await onClose(); })}>Continue with text AI turned off</button></p>
            <p className={styles.hint}>A model is the file that generates answers. An API key is a private password for a cloud service. Neither is needed for manual study planning.</p>
          </>}
          {s.step === 1 && <>
            {s.mode === "local" && <>
              <fieldset className={styles.fieldset}><legend>How should Butler run Local AI?</legend><label><input type="radio" name="engine" checked={s.localKind === "bundled"} onChange={() => update({ localKind: "bundled" })} /> Included llama.cpp engine · Windows x64 CPU</label><label><input type="radio" name="engine" checked={s.localKind === "external"} onChange={() => update({ localKind: "external" })} /> I already run Ollama or an OpenAI-compatible local service</label></fieldset>
              {s.localKind === "bundled" ? <>
                <div className={styles.row}><button disabled={!!busy} onClick={inspect}><Cpu size={16} /> Check this computer</button><span className={styles.hint}>Reads RAM, GPU and free space locally.</span></div>
                {hardware && <section className={styles.computer} aria-label="Computer summary"><dl><div><dt>System</dt><dd>{hardware.os} · {hardware.arch}</dd></div><div><dt>RAM now</dt><dd>{hardware.freeRamGiB.toFixed(1)} GiB free / {hardware.ramGiB.toFixed(1)} GiB</dd></div><div><dt>Model drive</dt><dd>{hardware.diskGiB === null ? "Unknown" : `${hardware.diskGiB.toFixed(1)} GiB free`}</dd></div><div><dt>GPU</dt><dd>{hardware.gpus.length ? hardware.gpus.map(g => `${g.name} (${g.vramGiB === null ? "VRAM unknown" : g.vramGiB.toFixed(1) + " GiB"})`).join(", ") : "Not detected"}</dd></div></dl><p>{advice?.backend}</p><p>{probe?.available ? `Engine probe passed: ${probe.version}` : probe?.error}</p></section>}
                <label className={styles.field}>Model folder<input value={folder} onChange={e => setFolder(e.target.value)} spellCheck={false} /></label>
                <div className={styles.row}><button disabled={!!busy} onClick={() => void run("folder", async () => { await save(); const result = await request("folder", { directory: folder }); setS(current => ({ ...current, modelsDir: result.directory })); latest.current = { ...latest.current, modelsDir: result.directory }; setFolder(result.directory); setFiles(result.models); await refresh(); setMessage("Model folder saved. Existing files were listed; no files were moved."); })}>Use this folder</button><span className={styles.hint}>Keep the default, or paste a local folder path from File Explorer.</span></div>
                <label className={styles.field}>Context size<select value={s.context} onChange={e => update({ context: Number(e.target.value) })}><option value={2048}>2,048 tokens · lower memory</option><option value={4096}>4,096 tokens · recommended starting point</option><option value={8192}>8,192 tokens · needs more memory</option></select><small>Context is how much text the model can consider at once. Longer documents may need smaller sections. Recheck this computer after changing it.</small></label>
                {advice && <div className={styles.advice}><h2>Choose for your task</h2><p><strong>Quality-first: </strong>{advice.qualityReason}</p><p><strong>Balanced: </strong>{advice.balancedReason}</p><small>These are conservative suggestions from catalog {status.catalogVersion}. We have not benchmarked every model on your computer.</small></div>}
                <fieldset className={styles.fieldset}><legend>Reviewed text models</legend>{status.catalog.map(model => <label key={model.id} className={styles.model}><input type="radio" name="model" checked={s.modelId === model.id} onChange={() => { update({ modelId: model.id }); setDownloadConsent(false); }} /><span><strong>{model.label}</strong><span>{(model.bytes / 1e9).toFixed(2)} GB download · {model.license}{advice?.quality === model.id ? " · Quality-first" : ""}{advice?.balanced === model.id ? " · Balanced" : ""}</span><span>{model.capability}</span><small>{model.limitations}</small><a href={model.source} target="_blank" rel="noreferrer">Official model card and license</a></span></label>)}</fieldset>
                {files.length > 0 && <details><summary>{files.length} model file(s) in this folder</summary>{files.map(f => <p key={f.filename}>{f.filename} · {(f.bytes / 1e9).toFixed(2)} GB{!f.id && " · Outside this reviewed catalog; use an existing local service to run it."}</p>)}<p>File presence is not verification. Butler checks the catalog SHA-256 before starting a bundled model.</p></details>}
                {selected && <section className={styles.download} aria-label="Model download"><h2>{selected.label}</h2><p>{(selected.bytes / 1e9).toFixed(2)} GB from Hugging Face · {selected.license}. Weights have their own license, separate from the MIT engine.</p><label><input type="checkbox" checked={downloadConsent} onChange={e => setDownloadConsent(e.target.checked)} /> I choose to download this model and accept its license.</label><div className={styles.row}><button disabled={!!busy || !downloadConsent || status.downloads.some(d => ["downloading", "verifying"].includes(d.state))} onClick={() => void run("download", async () => { await save(); await request("download", { id: selected.id, confirm: downloadConsent }); await refresh(); })}><Download size={16} /> {selectedDownload?.received ? "Resume / verify download" : "Download selected model"}</button></div>
                  {selectedDownload && <><progress aria-label="Model download progress" value={selectedDownload.received} max={selectedDownload.total} /><p className={styles.progressText}>{selectedDownload.state} · {(selectedDownload.received / 1e9).toFixed(2)} / {(selectedDownload.total / 1e9).toFixed(2)} GB</p>{selectedDownload.error && <p>{selectedDownload.error}</p>}{["downloading", "verifying"].includes(selectedDownload.state) && <button disabled={!!busy} onClick={() => void run("cancel", async () => { await request("cancel", { id: selected.id }); await refresh(); })}><Pause size={16} /> Cancel and keep partial download</button>}</>}
                  <details><summary>Version and integrity</summary><p>Revision: {selected.revision}</p><p className={styles.hash}>SHA-256: {selected.sha256}</p></details>
                </section>}
                <div className={styles.row}><button disabled={!!busy || !s.modelId || ["starting", "ready"].includes(status.engine.state)} onClick={() => void run("start", async () => { await save(); await request("start"); await refresh(); })}><Play size={16} /> Start engine</button><button disabled={!!busy || status.engine.state === "stopped"} onClick={() => void run("stop", async () => { await request("stop"); await refresh(); })}><Square size={16} /> Stop engine</button><span role="status">Engine: {status.engine.state}</span></div>{status.engine.error && <p className={styles.error}>{status.engine.error}</p>}
                <p className={styles.hint}>The engine listens only on 127.0.0.1. After restarting Butler, return here and start it again. No driver, startup service or scheduled task is installed.</p>
              </> : <>
                <label className={styles.field}>Local service URL<input value={s.externalURL} onChange={e => update({ externalURL: e.target.value })} spellCheck={false} /><small>For Ollama, start it yourself and install a model there, then use http://127.0.0.1:11434/v1. This route downloads nothing.</small></label>
                <button disabled={!!busy} onClick={() => void run("models", async () => { await save(); const result = await request("models"); setModels(result.models); setMessage(`${result.models.length} installed model(s) found. Choose one below.`); })}><RefreshCw size={16} /> Find installed models</button>
                <label className={styles.field}>Installed model<select value={s.externalModel} onChange={e => update({ externalModel: e.target.value })}><option value="">Choose a model</option>{Array.from(new Set([...models, ...(s.externalModel ? [s.externalModel] : [])])).map(id => <option key={id}>{id}</option>)}</select></label><p>Butler does not start or stop your existing service. Local mode accepts only a loopback address and never switches to DeepSeek when it is offline.</p>
              </>}
            </>}
            {s.mode === "deepseek" && <>
              <ol className={styles.instructions}><li>Open the <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">official DeepSeek API key page</a>. Create or sign in to your own account there.</li><li>Create an API key yourself. Review pricing and account balance on the official platform.</li><li>Paste the key below and save it. Butler never asks to log in or pay on your behalf.</li></ol>
              <label className={styles.field}>API key<input type="password" value={key} autoComplete="off" spellCheck={false} onChange={e => setKey(e.target.value)} placeholder={status.keyPresent ? "A protected key is saved. Paste to replace it." : "Paste your DeepSeek API key"} /><small>Encrypted with Windows DPAPI for this Windows account. Never shown again or included in study exports.</small></label>
              <div className={styles.row}><button disabled={!!busy || !key || !status.protectedStorage} onClick={() => void run("save-key", async () => { const transient = key; setKey(""); await request("save-key", { key: transient }); await save(); await refresh(); setMessage("API key saved in protected local storage."); })}>Save protected key</button><button disabled={!!busy || !status.keyPresent} onClick={() => void run("delete-key", async () => { await request("delete-key"); setKey(""); setTested(false); await refresh(); setMessage("Saved key removed."); })}>Remove saved key</button><span>{status.keyPresent ? "Key saved" : "No key saved"}</span></div>
              {!status.protectedStorage && <p className={styles.error}>Protected key storage is unavailable on this platform. Use Local with an existing service.</p>}
              <label className={styles.field}>DeepSeek model<select value={s.deepseekModel} onChange={e => update({ deepseekModel: e.target.value as AiSettings["deepseekModel"] })}><option value="deepseek-flash">deepseek-flash · general study work</option><option value="deepseek-v4-pro">deepseek-v4-pro · heavier tasks</option></select></label><p>Official base URL: <code>https://api.deepseek.com</code>. Model IDs verified on 21 October 2026. <a href="https://api-docs.deepseek.com/" target="_blank" rel="noreferrer">API documentation</a></p>
              <p className={styles.hint}>All text AI features use this choice, including extraction, research and any optional sync briefs you enable. Prompts and selected course context go to DeepSeek. Hardware details are never added. Switch to Local to keep text inference on this computer.</p>
            </>}
            {s.mode === "legacy" && <p>Your configured OLLAMA_SERVER_* and OLLAMA_WINDOWS_* primary/alternate routes are kept. All text AI features now use those routes. This mode may contact your configured network server. To restrict inference to this computer, go back and choose Local.</p>}
          </>}
          {s.step === 2 && <>
            <div className={styles.connection}><h2>{s.mode === "deepseek" ? "DeepSeek API" : bundled ? "Included local engine" : "Configured local service"}</h2><p>{s.mode === "deepseek" ? s.deepseekModel : bundled ? selected?.label || "Choose a model in Prepare" : s.externalModel || "Primary / alternate route"}</p><p>Connection testing lists models. The sample sends only a short synthetic question.</p></div>
            <button disabled={!!busy} onClick={() => void run("test", async () => { await save(); const result = await request("test"); setTested(true); setMessage(result.message); })}><RefreshCw size={16} /> Test connection</button>
            <label className={styles.consent}><input type="checkbox" checked={sampleConsent} onChange={e => setSampleConsent(e.target.checked)} /> Send one sample request to my selected provider. {s.mode === "deepseek" && "DeepSeek may charge a small amount."}</label>
            <button disabled={!!busy || !tested || !sampleConsent} onClick={() => void run("sample", async () => { await save(); const result = await request("sample", { confirm: sampleConsent }); setSample(result.sample); setMessage(result.message); })}>Send example: “Explain a study plan”</button>
            {sample && <section className={styles.sample}><h2>Model response</h2><p>{sample}</p><small>This checks text generation. Structured extraction and tool results still need your review.</small></section>}
            <OcrChoice checked={s.cloudOcr} onChange={value => update({ cloudOcr: value })} />
          </>}
          {s.step === 3 && <>
            <div className={styles.success}><CheckCircle2 size={28} /><h2>{sample ? "Your sample worked" : "Your setup is saved"}</h2><p>{sample ? "Try a question in Chat, or open a course and ask about a supplied lesson." : "You can finish now and test later from Settings → AI setup."}</p></div>
            <ol className={styles.instructions}><li>Open a course or paste a short section of your own notes.</li><li>Ask: “Explain this lesson and tell me which source you used.”</li><li>Check sources, dates and any proposed changes. An AI suggestion does not prove an assignment was submitted or a lesson was mastered.</li></ol>
            <p>Course answers use the selected course context. Proposed changes still use the existing confirmation flow. Your school profile, semester history and manual notes stay separate from AI setup.</p>
            <OcrChoice checked={s.cloudOcr} onChange={value => update({ cloudOcr: value })} />
          </>}
          <div aria-live="polite" aria-atomic="true">{busy && <p className={styles.feedback}>Working: {busy}…</p>}{message && <p className={styles.feedback}>{message}</p>}</div>
          {error && <div className={styles.error} role="alert"><strong>Could not complete this step</strong><p>{error}</p><p>Your courses and notes are safe. Correct the field or use the recovery tips below, then retry.</p></div>}
          <details className={styles.help}><summary>Help with downloads, keys, offline use or memory</summary><dl><dt>Download failed or app restarted</dt><dd>Partial bytes stay in the chosen folder. Select the same folder and model, confirm the download, then Resume. A full SHA-256 check runs before the model is used. Transfers do not resume automatically.</dd><dt>Not enough disk or RAM</dt><dd>Free space, close other apps, choose a smaller model or reduce context. CPU mode uses system RAM even if a GPU is listed. If the engine exits, stop and restart it after reducing memory use.</dd><dt>Invalid API key / no balance / rate limit</dt><dd>Save a valid key from the official platform. Check your own account balance for error 402. For 429, wait and retry fewer requests. Butler does not top up your account.</dd><dt>Offline or local service unavailable</dt><dd>Once a local model is verified, text inference needs no internet. Start the engine again after restarting Butler. For Ollama, start the service yourself. DeepSeek needs internet. Local never falls back to cloud.</dd><dt>Scanning and PDFs</dt><dd>Text PDFs can be read separately. Scanned files need the explicitly enabled Mistral cloud OCR service and its server-side key. No local OCR adapter is shipped. Optional browser semantic-model assets may require a first download.</dd></dl></details>
        </main>
      </div>
      <footer className={styles.footer}><button className={styles.quiet} disabled={!!busy} onClick={pause}>Skip for now · save progress</button><div className={styles.row}>{s.step > 0 && <button disabled={!!busy} onClick={() => void run("back", () => save({ ...s, step: s.step - 1 }))}><ArrowLeft size={16} /> Back</button>}{s.step > 0 && s.step < 3 && <button className={styles.primary} disabled={!!busy} onClick={next}>{s.step === 1 ? "Continue to test" : sample ? "Continue" : "Test later"}<ArrowRight size={16} /></button>}{s.step === 3 && <button className={styles.primary} disabled={!!busy} onClick={() => void run("finish", async () => { await save({ ...s, onboarding: "complete" }); setKey(""); await onClose(); })}>Start using Butler <ArrowRight size={16} /></button>}</div></footer>
    </div>
  </div>;
}
function OcrChoice({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <section className={styles.ocr}><h2>Scanned documents use a separate service</h2><p>Mistral OCR uploads a selected scanned file to Mistral. It is independent of your text AI choice and needs a separately configured MISTRAL_API_KEY. Local AI does not make this offline.</p><label><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /> Allow the separate Mistral cloud OCR service when I upload a scanned file</label><p><small>Leave this off to keep cloud OCR blocked. Manual notes and text PDFs remain available.</small></p></section>;
}
