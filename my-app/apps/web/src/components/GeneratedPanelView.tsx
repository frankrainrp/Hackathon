"use client";

// ============================================================
// components/GeneratedPanelView.tsx — 声明式「面板应用」渲染器（P1）
//
// 输入一份 GeneratedPanelSpec：
//   1. 并行取所有数据源（fetchSource：static / http 经连接器代理）
//   2. 按 source.refreshMs 自动刷新
//   3. 顺序渲染 blocks（stat/kpiGrid/table/bar/line/pie/list/markdown）
//   4. 「</> schema」开关：JSON 编辑器，apply 时 parseSpec 校验 → onChange
//
// 无任意代码执行；全部块从 schema 声明渲染。
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw, Code2, Eye, AlertTriangle, Loader2, Check, X, Sparkles, ArrowUp, Users, Zap, Plug } from "lucide-react";
import { generatePanelSpec } from "@/lib/panel-generator";
import { runResearch, type ResearchProgress } from "@/lib/research-client";
import DataSourceBuilder from "./DataSourceBuilder";
import {
  type GeneratedPanelSpec,
  type Block,
  type DataSource,
  type TableColumn,
  parseSpec,
  asArray,
  aggregate,
  toSeries,
  formatValue,
  getByPath,
} from "@/lib/panel-schema";
import { fetchSource, type SourceResult } from "@/lib/connector-client";
import { PieChart, BarChart, LineChart } from "./panel-modules/Charts";

interface Props {
  spec: GeneratedPanelSpec;
  /** schema 编辑保存（接入 CustomPanel 持久化）*/
  onChange?: (spec: GeneratedPanelSpec) => void;
}

type SourceState = { loading: boolean; result?: SourceResult };

export default function GeneratedPanelView({ spec, onChange }: Props) {
  const [states, setStates] = useState<Record<string, SourceState>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftErr, setDraftErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // P2 AI 组合器
  const [composerOpen, setComposerOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const genAbortRef = useRef<AbortController | null>(null);
  // P3 深度调研（多小队并行）
  const [deepMode, setDeepMode] = useState(false);
  const [research, setResearch] = useState<ResearchProgress | null>(null);
  // P4 数据源构建器（动态按需）
  const [builderOpen, setBuilderOpen] = useState(false);

  // 取单个数据源
  const loadSource = useCallback(async (source: DataSource, signal: AbortSignal) => {
    setStates((s) => ({ ...s, [source.id]: { loading: true, result: s[source.id]?.result } }));
    const result = await fetchSource(source, signal);
    if (signal.aborted) return;
    setStates((s) => ({ ...s, [source.id]: { loading: false, result } }));
  }, []);

  // 取全部 + 设置自动刷新
  const loadAll = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    spec.sources.forEach((src) => loadSource(src, controller.signal));
  }, [spec.sources, loadSource]);

  useEffect(() => {
    loadAll();
    // 自动刷新计时器（每个有 refreshMs 的源）
    const timers: ReturnType<typeof setInterval>[] = [];
    for (const src of spec.sources) {
      if (src.refreshMs && src.refreshMs >= 5000) {
        const controller = new AbortController();
        timers.push(setInterval(() => loadSource(src, controller.signal), src.refreshMs));
      }
    }
    return () => {
      abortRef.current?.abort();
      timers.forEach(clearInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  const openEditor = () => {
    setDraft(JSON.stringify(spec, null, 2));
    setDraftErr(null);
    setEditing(true);
  };
  const applyDraft = () => {
    const r = parseSpec(draft);
    if (r.ok === true) {
      setDraftErr(null);
      setEditing(false);
      onChange?.(r.spec);
    } else {
      setDraftErr(r.error);
    }
  };

  // 一句话 → 面板：快速生成(P2 单次) 或 深度调研(P3 多小队并行)
  const runGenerate = useCallback(async () => {
    const text = promptText.trim();
    if (!text || generating) return;
    setGenerating(true);
    setGenError(null);
    genAbortRef.current?.abort();
    const controller = new AbortController();
    genAbortRef.current = controller;

    if (deepMode) {
      setResearch({ phase: "planning", squads: [] });
      const r = await runResearch(text, setResearch, controller.signal);
      if (controller.signal.aborted) return;
      setGenerating(false);
      if (r.ok === true) {
        setComposerOpen(false);
        setResearch(null);
        setEditing(false);
        onChange?.(r.spec);
      } else {
        setGenError(r.error);
      }
      return;
    }

    const r = await generatePanelSpec(text, controller.signal);
    if (controller.signal.aborted) return;
    setGenerating(false);
    if (r.ok === true) {
      setComposerOpen(false);
      setEditing(false);
      onChange?.(r.spec);
    } else {
      setGenError(r.error);
    }
  }, [promptText, generating, deepMode, onChange]);

  // P4：插入动态配置的数据源 + 块到当前 spec
  const handleInsertSource = useCallback((source: GeneratedPanelSpec["sources"][number], blocks: GeneratedPanelSpec["blocks"]) => {
    onChange?.({
      ...spec,
      sources: [...spec.sources, source],
      blocks: [...spec.blocks, ...blocks],
    });
  }, [spec, onChange]);

  // P4：全局刷新间隔（写所有 http 源的 refreshMs）
  const currentRefresh = spec.sources.find((s) => s.kind === "http")?.refreshMs ?? 0;
  const setRefreshAll = useCallback((ms: number) => {
    onChange?.({
      ...spec,
      sources: spec.sources.map((s) => (s.kind === "http" ? { ...s, refreshMs: ms || undefined } : s)),
    });
  }, [spec, onChange]);
  const hasHttp = spec.sources.some((s) => s.kind === "http");

  const anyLoading = Object.values(states).some((s) => s.loading);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* 工具条 */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", flexShrink: 0,
          borderBottom: "1px solid var(--color-border-soft)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16 }}>{spec.emoji ?? "🧩"}</span>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {spec.title}
            </h2>
          </div>
          {spec.description && (
            <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", margin: "3px 0 0", lineHeight: 1.4 }}>
              {spec.description}
            </p>
          )}
        </div>
        <button
          onClick={() => { setComposerOpen((v) => !v); setGenError(null); }}
          title="AI 生成面板"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
            height: 32, padding: "0 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            fontSize: 12.5, fontWeight: 600,
            border: "none",
            background: composerOpen ? "var(--color-primary)" : "linear-gradient(150deg, var(--color-primary-hover), var(--color-primary))",
            color: "#fff",
          }}
        >
          <Sparkles size={13} /> AI 生成
        </button>
        <button
          onClick={() => setBuilderOpen(true)}
          title="添加数据源（按需动态配置）"
          aria-label="添加数据源"
          style={iconBtn}
        >
          <Plug size={14} />
        </button>
        {/* 定时刷新间隔（有 http 源时显示）*/}
        {hasHttp && (
          <select
            value={currentRefresh}
            onChange={(e) => setRefreshAll(Number(e.target.value))}
            title="自动刷新间隔"
            aria-label="自动刷新间隔"
            style={{
              height: 32, borderRadius: 8, flexShrink: 0, cursor: "pointer",
              border: "1px solid var(--color-border)", background: "var(--color-bg)",
              color: "var(--color-text-muted)", fontSize: 12, fontFamily: "inherit", padding: "0 6px",
            }}
          >
            <option value={0}>不刷新</option>
            <option value={30000}>30 秒</option>
            <option value={60000}>1 分钟</option>
            <option value={300000}>5 分钟</option>
          </select>
        )}
        <button
          onClick={loadAll}
          title="刷新数据"
          aria-label="刷新数据"
          style={iconBtn}
        >
          <RefreshCw size={14} style={anyLoading ? { animation: "spin 0.8s linear infinite" } : undefined} />
        </button>
        <button
          onClick={editing ? () => setEditing(false) : openEditor}
          title={editing ? "返回预览" : "编辑 schema"}
          style={{ ...iconBtn, ...(editing ? { background: "var(--color-primary-soft)", color: "var(--color-primary)" } : null) }}
        >
          {editing ? <Eye size={14} /> : <Code2 size={14} />}
        </button>
      </div>

      {/* P4 数据源构建器（动态按需，非写死目录）*/}
      <DataSourceBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} onInsert={handleInsertSource} />

      {/* P2 AI 组合器（一句话 → 生成面板）*/}
      {composerOpen && (
        <PanelComposer
          value={promptText}
          onChange={setPromptText}
          generating={generating}
          error={genError}
          deepMode={deepMode}
          onToggleDeep={() => setDeepMode((v) => !v)}
          research={research}
          onGenerate={runGenerate}
          onClose={() => { setComposerOpen(false); setResearch(null); }}
        />
      )}

      {editing ? (
        <SchemaEditor draft={draft} setDraft={setDraft} err={draftErr} onApply={applyDraft} onCancel={() => setEditing(false)} />
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", minHeight: 0 }}>
          <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
            {spec.blocks.map((block) => (
              <BlockCard key={block.id} block={block} states={states} />
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ============================================================
// 单个块卡片
// ============================================================
/** 从 states 取某数据源已解析的数据（ok 时返回 data，否则 undefined）*/
function resolveData(states: Record<string, SourceState>, sourceId?: string): unknown {
  if (!sourceId) return undefined;
  const r = states[sourceId]?.result;
  return r && r.ok === true ? r.data : undefined;
}

function BlockCard({ block, states }: { block: Block; states: Record<string, SourceState> }) {
  const fullWidth = (block.span ?? 2) === 2;
  const needsData = block.type !== "markdown" && block.type !== "kpiGrid";
  // 主数据源：块级 sourceId（kpiGrid 用各 metric 自己的 sourceId，不靠块级）
  const state = block.sourceId ? states[block.sourceId] : undefined;

  let body: React.ReactNode;
  if (needsData && state?.loading && !state.result) {
    body = <Skeleton />;
  } else if (needsData && state?.result && state.result.ok === false) {
    body = <ErrorHint msg={state.result.error} />;
  } else {
    body = <BlockBody block={block} data={resolveData(states, block.sourceId)} states={states} />;
  }

  return (
    <section
      style={{
        gridColumn: fullWidth ? "1 / -1" : "auto",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: "14px 16px",
        minWidth: 0,
      }}
    >
      {block.title && (
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", margin: "0 0 10px", letterSpacing: 0.3 }}>
          {block.title}
        </h3>
      )}
      {body}
    </section>
  );
}

function BlockBody({ block, data, states }: { block: Block; data: unknown; states: Record<string, SourceState> }) {
  const rows = asArray(data);
  switch (block.type) {
    case "markdown":
      return (
        <div className="md-body" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text)" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.markdown ?? ""}</ReactMarkdown>
        </div>
      );

    case "stat": {
      const n = block.value != null ? block.value : aggregate(rows, block.agg ?? "count", block.field);
      return (
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
            {formatValue(n, block.format ?? "number")}
          </div>
        </div>
      );
    }

    case "kpiGrid": {
      const metrics = block.metrics ?? [];
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(metrics.length || 1, 3)}, 1fr)`, gap: 10 }}>
          {metrics.map((m, i) => {
            // 每个指标用自己的 sourceId（回退块级 data）
            const mRows = m.sourceId ? asArray(resolveData(states, m.sourceId)) : rows;
            const n = m.value != null ? m.value : aggregate(mRows, m.agg ?? "count", m.field);
            return (
              <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--color-bg)", border: "1px solid var(--color-border-soft)" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.3px" }}>
                  {formatValue(n, m.format ?? "number")}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      );
    }

    case "bar":
      return <BarChart data={toSeries(rows, block.x, block.y, block.limit)} />;
    case "line":
      return <LineChart data={toSeries(rows, block.x, block.y, block.limit)} />;
    case "pie":
      return <PieChart data={toSeries(rows, block.x, block.y, block.limit)} />;

    case "list": {
      const capped = block.limit ? rows.slice(0, block.limit) : rows;
      if (capped.length === 0) return <EmptyHint />;
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {capped.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i === capped.length - 1 ? "none" : "1px solid var(--color-border-soft)" }}>
              <span style={{ fontSize: 11, color: "var(--color-text-faint)", width: 18, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {block.primary ? String(getByPath(r, block.primary) ?? "") : JSON.stringify(r)}
              </span>
              {block.secondary && (
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0 }}>
                  {String(getByPath(r, block.secondary) ?? "")}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "table": {
      const cols = block.columns ?? inferColumns(rows);
      const capped = block.limit ? rows.slice(0, block.limit) : rows;
      if (capped.length === 0) return <EmptyHint />;
      return (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capped.map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => {
                    const raw = getByPath(r, c.key);
                    const pctNeg = c.format === "percent" && Number(raw) < 0;
                    const pctPos = c.format === "percent" && Number(raw) > 0;
                    return (
                      <td key={c.key} style={{ padding: "6px 10px", borderBottom: "1px solid var(--color-border-soft)", color: pctNeg ? "var(--color-danger)" : pctPos ? "var(--color-success)" : "var(--color-text)", whiteSpace: "nowrap" }}>
                        {formatValue(raw, c.format)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    default:
      return <ErrorHint msg={`未知块类型：${block.type}`} />;
  }
}

function inferColumns(rows: Record<string, unknown>[]): TableColumn[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]).slice(0, 6).map((k) => ({ key: k, label: k }));
}

// ============================================================
// P2 AI 组合器：一句话 → 生成面板
// ============================================================
const EXAMPLE_PROMPTS = [
  "Crypto 市值 Top 10 实时行情",
  "东南亚 Twitch 主播月收益榜",
  "USD 对各国汇率仪表盘",
  "潜力股产业链概览（半导体）",
];
const DEEP_EXAMPLES = [
  "半导体潜力股产业链分析",
  "扫地机器人 Top 公司按规格分类",
  "新能源车电池供应链调研",
  "东南亚电商平台竞品对比",
];

function PanelComposer({
  value, onChange, generating, error, deepMode, onToggleDeep, research, onGenerate, onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  generating: boolean;
  error: string | null;
  deepMode: boolean;
  onToggleDeep: () => void;
  research: ResearchProgress | null;
  onGenerate: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        flexShrink: 0,
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border-soft)",
        background: "color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))",
      }}
    >
      {/* 模式切换：快速生成 / 深度调研 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <ModePill active={!deepMode} onClick={() => deepMode && onToggleDeep()} icon={<Zap size={12} />} label="快速生成" disabled={generating} />
        <ModePill active={deepMode} onClick={() => !deepMode && onToggleDeep()} icon={<Users size={12} />} label="深度调研 · 多小队并行" disabled={generating} />
      </div>

      <div
        style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          border: "1px solid var(--color-border)", borderRadius: 12,
          background: "var(--color-bg)", padding: 8,
        }}
      >
        <Sparkles size={16} color="var(--color-primary)" style={{ flexShrink: 0, margin: "8px 0 0 4px" }} />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onGenerate(); }
          }}
          placeholder={deepMode
            ? "给个复杂调研目标，例如：半导体潜力股产业链分析 / 扫地机器人 Top 公司按规格分类…（多小队并行调查）"
            : "描述你想要的面板，例如：做一个长桥持仓 + 当日盈亏的交易台…（⌘/Ctrl+Enter 生成）"}
          rows={2}
          disabled={generating}
          style={{
            flex: 1, minWidth: 0, resize: "none", border: "none", outline: "none",
            background: "transparent", color: "var(--color-text)", fontSize: 13,
            lineHeight: 1.5, fontFamily: "inherit", padding: "6px 2px",
          }}
        />
        <button
          onClick={onGenerate}
          disabled={generating || !value.trim()}
          title="生成（⌘/Ctrl+Enter）"
          aria-label="生成"
          style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: 9, border: "none",
            background: value.trim() && !generating ? "var(--color-primary)" : "var(--color-border)",
            color: value.trim() && !generating ? "#fff" : "var(--color-text-faint)",
            cursor: value.trim() && !generating ? "pointer" : "default",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {generating ? <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> : <ArrowUp size={16} />}
        </button>
        <button
          onClick={onClose}
          aria-label="关闭"
          style={{ ...iconBtn, width: 30, height: 30, alignSelf: "flex-start" }}
        >
          <X size={13} />
        </button>
      </div>

      {/* 示例 chips（非调研进行时）*/}
      {!research && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {(deepMode ? DEEP_EXAMPLES : EXAMPLE_PROMPTS).map((ex) => (
            <button
              key={ex}
              onClick={() => onChange(ex)}
              disabled={generating}
              style={{
                padding: "4px 10px", borderRadius: 999, cursor: generating ? "default" : "pointer",
                border: "1px solid var(--color-border)", background: "var(--color-surface)",
                color: "var(--color-text-muted)", fontSize: 11.5, fontFamily: "inherit",
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* P3 小队进度 */}
      {research && <ResearchProgressView research={research} />}

      {/* 快速生成 loading 提示 */}
      {generating && !deepMode && (
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
          <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> AI 正在搭建面板…（真实公共 API 优先，否则用样本数据保证可用）
        </p>
      )}
      {error && (
        <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={13} /> {error}
        </p>
      )}
    </div>
  );
}

function ModePill({ active, onClick, icon, label, disabled }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 11px", borderRadius: 999, cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
        fontSize: 11.5, fontWeight: 600,
        border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
        background: active ? "var(--color-primary)" : "var(--color-surface)",
        color: active ? "#fff" : "var(--color-text-muted)",
      }}
    >
      {icon} {label}
    </button>
  );
}

const PHASE_LABEL: Record<ResearchProgress["phase"], string> = {
  planning: "正在拆解调研任务…",
  investigating: "多小队并行调查中…",
  assembling: "正在聚合成面板…",
  done: "完成",
  error: "出错",
};

function ResearchProgressView({ research }: { research: ResearchProgress }) {
  const STATUS_META: Record<string, { color: string; spin?: boolean; icon: React.ReactNode }> = {
    pending: { color: "var(--color-text-faint)", icon: <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--color-text-faint)" }} /> },
    running: { color: "var(--color-primary)", spin: true, icon: <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> },
    done: { color: "var(--color-success)", icon: <Check size={13} /> },
    error: { color: "var(--color-danger)", icon: <X size={13} /> },
  };
  const doneCount = research.squads.filter((s) => s.status === "done").length;
  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
        <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} />
        {PHASE_LABEL[research.phase]}
        {research.squads.length > 0 && research.phase === "investigating" && (
          <span style={{ color: "var(--color-text-faint)", fontWeight: 500 }}>· {doneCount}/{research.squads.length}</span>
        )}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
        {research.squads.map((sq, i) => {
          const meta = STATUS_META[sq.status];
          return (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "9px 11px", borderRadius: 10,
                border: `1px solid ${sq.status === "running" ? "var(--color-primary)" : "var(--color-border)"}`,
                background: "var(--color-bg)",
                opacity: sq.status === "pending" ? 0.6 : 1,
                transition: "opacity 0.2s, border-color 0.2s",
              }}
            >
              <span style={{ color: meta.color, flexShrink: 0, marginTop: 1, display: "inline-flex", width: 14, justifyContent: "center" }}>{meta.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-text)" }}>{sq.title}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {sq.question}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// schema 编辑器
// ============================================================
function SchemaEditor({
  draft, setDraft, err, onApply, onCancel,
}: {
  draft: string;
  setDraft: (v: string) => void;
  err: string | null;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Code2 size={13} color="var(--color-text-muted)" />
        <span style={{ fontSize: 12, color: "var(--color-text-muted)", flex: 1 }}>
          面板 schema（JSON）— 改完点应用即时重渲。P2 起这份由 AI 自动生成。
        </span>
        <button onClick={onApply} style={{ ...pillBtn, background: "var(--color-primary)", color: "#fff", border: "none" }}>
          <Check size={13} /> 应用
        </button>
        <button onClick={onCancel} style={pillBtn}>
          <X size={13} /> 取消
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1, minHeight: 0, resize: "none",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12.5, lineHeight: 1.5,
          padding: "12px 14px", borderRadius: 10,
          border: `1px solid ${err ? "var(--color-danger)" : "var(--color-border)"}`,
          background: "var(--color-bg)", color: "var(--color-text)",
          outline: "none", whiteSpace: "pre", overflowWrap: "normal", overflow: "auto",
        }}
      />
      {err && (
        <p style={{ fontSize: 12, color: "var(--color-danger)", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={13} /> {err}
        </p>
      )}
    </div>
  );
}

// ============================================================
// 小件
// ============================================================
function Skeleton() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: "var(--color-text-faint)", fontSize: 12 }}>
      <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> 加载中…
    </div>
  );
}
function ErrorHint({ msg }: { msg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", borderRadius: 10, background: "var(--color-danger-soft)", color: "var(--color-danger)", fontSize: 12, lineHeight: 1.45 }}>
      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ minWidth: 0, wordBreak: "break-word" }}>{msg}</span>
    </div>
  );
}
function EmptyHint() {
  return <div style={{ padding: "20px 8px", textAlign: "center", fontSize: 12, color: "var(--color-text-faint)" }}>暂无数据</div>;
}

const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
  border: "1px solid var(--color-border)", background: "var(--color-bg)",
  color: "var(--color-text-muted)", cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const pillBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "6px 12px", borderRadius: 8,
  border: "1px solid var(--color-border)", background: "var(--color-bg)",
  color: "var(--color-text-muted)", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};
