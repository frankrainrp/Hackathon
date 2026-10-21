"use client";
import { appFetch as fetch } from "@/lib/messages";

import { uiText, localizeExternal } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";


// ============================================================
// components/DataSourceBuilder.tsx — 动态数据源构建器（替代写死的模板目录）
//
// 两条按需路径，都不依赖固定服务清单：
//   1. AI 智能配置：描述想要的数据 → AI 临时推断 url/参数/path/鉴权占位 → 预览 → 插入
//   2. 手动配置：通用表单（URL/method/query/headers/path/pivot），任意 API
// 密钥用 env:KEY 占位（连接器服务端注入），不进前端。
// 数据源只插进当前面板 spec —— 面板内自洽，无全局注册表。
// ============================================================

import React, { useState } from "react";
import { X, Sparkles, Loader2, Plus, KeyRound, Wand2, SlidersHorizontal, AlertTriangle, ArrowRight, Trash2 } from "lucide-react";
import { useIsMobile } from "@/lib/use-is-mobile";
import type { DataSource, Block } from "@/lib/panel-schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (source: DataSource, blocks: Block[]) => void;
}

type KV = { k: string; v: string };
const newId = () => "src-" + Math.random().toString(36).slice(2, 8);

/** 扫描源里出现的 env:KEY 占位，提示用户配置 */
function scanEnvKeys(src: DataSource): string[] {
  const found = new Set<string>();
  const scan = (s?: string) => {
    if (!s) return;
    const re = /env:([A-Za-z_][A-Za-z0-9_]*)/g;
    let m;
    while ((m = re.exec(s))) found.add(m[1]);
  };
  scan(src.url);
  Object.values(src.headers ?? {}).forEach((v) => scan(String(v)));
  Object.values(src.query ?? {}).forEach((v) => scan(String(v)));
  return Array.from(found);
}

export default function DataSourceBuilder({ open, onClose, onInsert }: Props) {
  const uiLanguage = useCopyLanguage().lang;
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--color-overlay)", zIndex: 92, animation: "fade-in 0.18s ease-out" }} />
      <div
        role="dialog"
        aria-label={uiText("ui.datasourcebuilder.5b1b881d08")}
        style={{
          position: "fixed",
          ...(isMobile
            ? { left: 0, right: 0, top: 0, bottom: 0 }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, maxWidth: "94vw", maxHeight: "90vh", borderRadius: 18, animation: "modal-pop 0.22s cubic-bezier(0.16,1,0.3,1)" }),
          display: "flex", flexDirection: "column", overflow: "hidden",
          background: "var(--color-bg)", border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-modal)", zIndex: 93, color: "var(--color-text)",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", padding: "16px 18px 12px", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{uiText("ui.datasourcebuilder.26ad5bb318")}</h2>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "3px 0 0" }}>{uiText("ui.datasourcebuilder.73d94b3df5")}<code style={{ fontFamily: "ui-monospace,monospace" }}>env:KEY</code>{uiText("ui.datasourcebuilder.3344372934")}</p>
          </div>
          <button onClick={onClose} aria-label={uiText("ui.datasourcebuilder.3fd47edce4")} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--color-surface)", cursor: "pointer", color: "var(--color-text-muted)", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </header>

        {/* 模式切换 */}
        <div style={{ display: "flex", gap: 6, padding: "0 18px 12px", flexShrink: 0 }}>
          <ModeTab active={mode === "ai"} onClick={() => setMode("ai")} icon={<Wand2 size={13} />} label={uiText("ui.datasourcebuilder.34cab96baf")} />
          <ModeTab active={mode === "manual"} onClick={() => setMode("manual")} icon={<SlidersHorizontal size={13} />} label={uiText("ui.datasourcebuilder.390ef225fb")} />
        </div>

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "0 18px 18px" }}>
          {mode === "ai"
            ? <AiMode onInsert={(s, b) => { onInsert(s, b); onClose(); }} />
            : <ManualMode onInsert={(s, b) => { onInsert(s, b); onClose(); }} />}
        </div>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-pop { from { transform: translate(-50%, -50%) scale(0.96); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
      `}</style>
    </>
  );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  const uiLanguage = useCopyLanguage().lang;
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
        fontSize: 12.5, fontWeight: 600,
        border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
        background: active ? "var(--color-primary)" : "var(--color-surface)",
        color: active ? "#fff" : "var(--color-text-muted)",
      }}
    >
      {icon} {label}
    </button>
  );
}

// ============================================================
// AI 智能配置
// ============================================================
function AiMode({ onInsert }: { onInsert: (s: DataSource, b: Block[]) => void }) {
  const uiLanguage = useCopyLanguage().lang;
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ source: DataSource; blocks: Block[] } | null>(null);

  const generate = async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true); setError(null); setPreview(null);
    try {
      const res = await fetch("/api/generate-source", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const json = (await res.json()) as { ok: boolean; source?: DataSource; blocks?: Block[]; error?: string };
      if (json.ok === true && json.source) setPreview({ source: json.source, blocks: json.blocks ?? [] });
      else setError(json.error ?? uiText("ui.datasourcebuilder.470f92db3d"));
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };

  const envKeys = preview ? scanEnvKeys(preview.source) : [];

  return (
    <div style={{ paddingTop: 4 }}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); generate(); } }}
        placeholder={uiText("ui.datasourcebuilder.64c0456b8a")}
        rows={3}
        disabled={loading}
        style={{
          width: "100%", resize: "vertical", boxSizing: "border-box",
          border: "1px solid var(--color-border)", borderRadius: 12, padding: "10px 12px",
          background: "var(--color-surface)", color: "var(--color-text)", fontSize: 13, lineHeight: 1.5,
          fontFamily: "inherit", outline: "none",
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {[uiText("ui.datasourcebuilder.101f86b65d"), uiText("ui.datasourcebuilder.4ab3ac917a"), uiText("ui.datasourcebuilder.16874ef137")].map((ex) => (
          <button key={ex} onClick={() => setPrompt(ex)} disabled={loading} style={chip}>{ex}</button>
        ))}
      </div>
      <button onClick={generate} disabled={loading || !prompt.trim()} style={{ ...primaryBtn, marginTop: 12, opacity: loading || !prompt.trim() ? 0.6 : 1 }}>
        {loading ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Sparkles size={14} />}
        {loading ? uiText("ui.datasourcebuilder.0ea220ec46") : uiText("ui.datasourcebuilder.567f2e79d0")}
      </button>

      {error && <ErrLine msg={localizeExternal(error)} />}

      {preview && (
        <div style={{ marginTop: 14, border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "var(--color-surface)", borderBottom: "1px solid var(--color-border-soft)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 6px" }}>{uiText("ui.datasourcebuilder.6c425af86e")}</p>
            <KvLine label={uiText("ui.datasourcebuilder.ba40014ff4")} value={preview.source.kind === "http" ? uiText("ui.datasourcebuilder.78b0126bdf") : uiText("ui.datasourcebuilder.654cfe1a49")} />
            {preview.source.url && <KvLine label="URL" value={preview.source.url} mono />}
            {preview.source.path && <KvLine label={uiText("ui.datasourcebuilder.a0af9f865b")} value={preview.source.path} mono />}
            <KvLine label={uiText("ui.datasourcebuilder.b6e1aec64d")} value={preview.blocks.map((b) => b.type).join(" · ") || uiText("ui.datasourcebuilder.c7bcc6d27f")} />
            {envKeys.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11.5, color: "var(--color-warning)" }}>
                <KeyRound size={12} />{uiText("ui.datasourcebuilder.dc2bb5e778")}{envKeys.map((k) => <code key={k} style={envChip}>{k}</code>)}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, padding: 12 }}>
            <button onClick={() => onInsert(preview.source, preview.blocks)} style={{ ...primaryBtn, flex: 1 }}>
              <Plus size={14} />{uiText("ui.datasourcebuilder.d42a859dd3")}</button>
            <button onClick={generate} style={secondaryBtn}>{uiText("ui.datasourcebuilder.3221a042ea")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 手动配置
// ============================================================
function ManualMode({ onInsert }: { onInsert: (s: DataSource, b: Block[]) => void }) {
  const uiLanguage = useCopyLanguage().lang;
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [path, setPath] = useState("");
  const [query, setQuery] = useState<KV[]>([{ k: "", v: "" }]);
  const [headers, setHeaders] = useState<KV[]>([{ k: "", v: "" }]);
  const [pivot, setPivot] = useState(false);

  const kvToObj = (rows: KV[]) => {
    const o: Record<string, string> = {};
    rows.forEach((r) => { if (r.k.trim()) o[r.k.trim()] = r.v; });
    return Object.keys(o).length ? o : undefined;
  };

  const canAdd = url.trim().length > 0;
  const add = () => {
    if (!canAdd) return;
    const id = newId();
    const source: DataSource = {
      id, kind: "http",
      url: url.trim(), method,
      ...(kvToObj(query) ? { query: kvToObj(query) } : {}),
      ...(kvToObj(headers) ? { headers: kvToObj(headers) } : {}),
      ...(path.trim() ? { path: path.trim() } : {}),
      ...(pivot ? { pivot: { keyName: "key", valueName: "value" } } : {}),
    };
    const blocks: Block[] = [{ id: `${id}-tbl`, type: "table", title: uiText("ui.datasourcebuilder.5440f7424f"), sourceId: id, limit: 20 }];
    onInsert(source, blocks);
  };

  const envKeys = scanEnvKeys({
    id: "x", kind: "http", url, query: kvToObj(query), headers: kvToObj(headers),
  });

  return (
    <div style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="URL">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/v1/items" style={inputMono} />
      </Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label={uiText("ui.datasourcebuilder.22b9f0b662")} grow={false}>
          <select value={method} onChange={(e) => setMethod(e.target.value as "GET" | "POST")} style={{ ...input, width: 90 }}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </Field>
        <Field label={uiText("ui.datasourcebuilder.06923cd8a7")}>
          <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="data.items" style={inputMono} />
        </Field>
      </div>

      <KvEditor label={uiText("ui.datasourcebuilder.835f33e0e1")} rows={query} setRows={setQuery} placeholderK={uiText("ui.datasourcebuilder.aa066c5382")} placeholderV={uiText("ui.datasourcebuilder.cda1d55c52")} />
      <KvEditor label={uiText("ui.datasourcebuilder.7ba190d099")} rows={headers} setRows={setHeaders} placeholderK={uiText("ui.datasourcebuilder.5bc55cef48")} placeholderV={uiText("ui.datasourcebuilder.af535828a1")} />

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--color-text)", cursor: "pointer" }}>
        <input type="checkbox" checked={pivot} onChange={(e) => setPivot(e.target.checked)} style={{ accentColor: "var(--color-primary)" }} />{uiText("ui.datasourcebuilder.4a0240bd3e")}</label>

      {envKeys.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--color-warning)", flexWrap: "wrap" }}>
          <KeyRound size={12} />{uiText("ui.datasourcebuilder.5f8c53ff29")}{envKeys.map((k) => <code key={k} style={envChip}>{k}</code>)}
        </div>
      )}

      <button onClick={add} disabled={!canAdd} style={{ ...primaryBtn, opacity: canAdd ? 1 : 0.6, marginTop: 2 }}>
        <ArrowRight size={14} />{uiText("ui.datasourcebuilder.fd4ac05e1f")}</button>
    </div>
  );
}

function KvEditor({ label, rows, setRows, placeholderK, placeholderV }: { label: string; rows: KV[]; setRows: (r: KV[]) => void; placeholderK: string; placeholderV: string }) {
  const uiLanguage = useCopyLanguage().lang;
  const update = (i: number, patch: Partial<KV>) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ k: "", v: "" }]);
  const add = () => setRows([...rows, { k: "", v: "" }]);
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", margin: "0 0 6px" }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={r.k} onChange={(e) => update(i, { k: e.target.value })} placeholder={placeholderK} style={{ ...inputMono, flex: 1 }} />
            <input value={r.v} onChange={(e) => update(i, { v: e.target.value })} placeholder={placeholderV} style={{ ...inputMono, flex: 1.4 }} />
            <button onClick={() => remove(i)} aria-label={uiText("ui.datasourcebuilder.2f9daa8289")} style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 7, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-faint)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, border: "1px dashed var(--color-border)", background: "transparent", color: "var(--color-text-muted)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
        <Plus size={11} />{uiText("ui.datasourcebuilder.003121b6ad")}</button>
    </div>
  );
}

// ---------- 小件 ----------
function Field({ label, children, grow = true }: { label: string; children: React.ReactNode; grow?: boolean }) {
  const uiLanguage = useCopyLanguage().lang;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: grow ? 1 : "none", minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)" }}>{label}</span>
      {children}
    </label>
  );
}
function KvLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const uiLanguage = useCopyLanguage().lang;
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 12, padding: "2px 0", minWidth: 0 }}>
      <span style={{ color: "var(--color-text-muted)", flexShrink: 0, width: 56 }}>{label}</span>
      <span style={{ color: "var(--color-text)", wordBreak: "break-all", fontFamily: mono ? "ui-monospace,monospace" : "inherit", fontSize: mono ? 11.5 : 12 }}>{value}</span>
    </div>
  );
}
function ErrLine({ msg }: { msg: string }) {
  const uiLanguage = useCopyLanguage().lang;
  return <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "10px 0 0", display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} /> {msg}</p>;
}

const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8,
  border: "1px solid var(--color-border)", background: "var(--color-surface)",
  color: "var(--color-text)", fontSize: 13, fontFamily: "inherit", outline: "none",
};
const inputMono: React.CSSProperties = { ...input, fontFamily: "ui-monospace, monospace", fontSize: 12 };
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "9px 16px", borderRadius: 10, border: "none",
  background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};
const secondaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "9px 14px", borderRadius: 10, border: "1px solid var(--color-border)",
  background: "var(--color-surface)", color: "var(--color-text-muted)", fontSize: 13, fontWeight: 500,
  cursor: "pointer", fontFamily: "inherit",
};
const chip: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 999, cursor: "pointer",
  border: "1px solid var(--color-border)", background: "var(--color-surface)",
  color: "var(--color-text-muted)", fontSize: 11.5, fontFamily: "inherit",
};
const envChip: React.CSSProperties = {
  fontSize: 10.5, fontFamily: "ui-monospace,monospace", padding: "1px 6px", borderRadius: 5,
  background: "var(--color-warning-soft)", color: "var(--color-warning)",
};
