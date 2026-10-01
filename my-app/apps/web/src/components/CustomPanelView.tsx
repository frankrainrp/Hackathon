"use client";

// ============================================================
// components/CustomPanelView.tsx — Phase E 自定义面板渲染
//
// 占据主区，类似 NotesPanel 的单页 markdown 编辑器。
// 顶部：emoji + 可编辑 label + 删除按钮 + 编辑/预览切换
// 中部：textarea（编辑）/ ReactMarkdown 渲染（预览）
// 自动保存：1.2s 防抖（同 NotesPanel B4 风格）
// ============================================================

import React, { useEffect, useRef, useState } from "react";
import { Trash2, Eye, Edit3, FileText, Globe, AlertTriangle, LayoutGrid, Plus, BarChart3, PieChart as PieIcon, Hash, Timer, ListChecks, Grid3x3, Boxes } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CustomPanel, CustomPanelKind, PanelModule, PanelModuleType } from "@/lib/types";
import { EmptyPanel } from "./EmptyIllustrations";
import ModuleRenderer from "./panel-modules/ModuleRenderer";
import type { PanelDataCtx } from "@/lib/panel-data";
import GeneratedPanelView from "./GeneratedPanelView";
import { SAMPLE_SPEC, type GeneratedPanelSpec } from "@/lib/panel-schema";

interface Props {
  panel: CustomPanel;
  onUpdate: (id: string, patch: Partial<Pick<CustomPanel, "label" | "emoji" | "content" | "kind" | "url" | "modules" | "spec">>) => void;
  onDelete: (id: string) => void;
  /** [064] 模组数据绑定上下文（真实 ddls/notes/streak）*/
  dataCtx: PanelDataCtx;
}

// [064] 加模组菜单：每项给一个带 live 默认配置的模组
const MODULE_PRESETS: { type: PanelModuleType; label: string; icon: React.ReactNode; make: () => PanelModule }[] = [
  { type: "stat", label: "统计卡", icon: <Hash size={13} />, make: () => ({ id: mid(), type: "stat", title: "待办任务", config: { metric: "tasks-active" } }) },
  { type: "countdown", label: "倒计时", icon: <Timer size={13} />, make: () => ({ id: mid(), type: "countdown", title: "最近截止", config: {} }) },
  { type: "tasklist", label: "任务清单", icon: <ListChecks size={13} />, make: () => ({ id: mid(), type: "tasklist", title: "进行中", config: { filter: "active", limit: 6 } }) },
  { type: "pie", label: "饼图", icon: <PieIcon size={13} />, make: () => ({ id: mid(), type: "pie", title: "任务状态分布", config: { metric: "tasks-by-status" } }) },
  { type: "bar", label: "柱状图", icon: <BarChart3 size={13} />, make: () => ({ id: mid(), type: "bar", title: "近 7 日到期", config: { metric: "completion-7d" } }) },
  { type: "heatmap", label: "热力图", icon: <Grid3x3 size={13} />, make: () => ({ id: mid(), type: "heatmap", title: "任务热力图", config: {} }) },
];

function mid(): string {
  return "mod-" + Math.random().toString(36).slice(2, 9);
}

function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return "https://" + v;
}

function KindBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "6px 9px", border: "none",
        background: active ? "var(--color-primary-soft)" : "transparent",
        color: active ? "var(--color-primary)" : "var(--color-text-muted)",
        fontSize: 11.5, fontWeight: active ? 600 : 500,
        cursor: "pointer", fontFamily: "inherit",
      }}
    >
      {icon} {label}
    </button>
  );
}

type PanelPatch = Partial<Pick<CustomPanel, "label" | "emoji" | "content" | "kind" | "url" | "modules" | "spec">>;

export default function CustomPanelView({ panel, onUpdate, onDelete, dataCtx }: Props) {
  const kind: CustomPanelKind = panel.kind ?? "markdown";
  const [content, setContent] = useState(panel.content);
  const [label, setLabel] = useState(panel.label);
  const [emoji, setEmoji] = useState(panel.emoji);
  const [url, setUrl] = useState(panel.url ?? "");
  const [modules, setModules] = useState<PanelModule[]>(panel.modules ?? []);
  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">(panel.content ? "preview" : "edit");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // [055 F#1+F#3] 修复：
  //   #1 unmount 用 stale 闭包丢编辑 → 改用 ref 跟踪「上一个 panelId」+「累积 patch」
  //   #3 scheduleSave 不同字段连改前一个丢失 → patch 累积到 pendingPatchRef，timer fire 一起 flush
  const pendingPatchRef = useRef<PanelPatch>({});
  const prevIdRef = useRef(panel.id);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // 立即 flush helper：清 timer + 一次性发出累积 patch
  // 注意用 onUpdateRef 而非闭包 onUpdate，避免 unmount 时拿到 stale prop
  const flushNow = (id: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (Object.keys(pendingPatchRef.current).length > 0) {
      onUpdateRef.current(id, pendingPatchRef.current);
      pendingPatchRef.current = {};
    }
  };

  // 切换面板时：先 flush 上一个 panel 的累积 patch（用 prevIdRef）
  useEffect(() => {
    if (prevIdRef.current !== panel.id) {
      flushNow(prevIdRef.current);
      prevIdRef.current = panel.id;
    }
    setContent(panel.content);
    setLabel(panel.label);
    setEmoji(panel.emoji);
    setUrl(panel.url ?? "");
    setModules(panel.modules ?? []);
    setMode(panel.content ? "preview" : "edit");
  }, [panel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // unmount 时 flush 最终编辑（用 prevIdRef，cleanup 跑在 panel 切换之前）
  useEffect(() => {
    return () => {
      flushNow(prevIdRef.current);
    };
  }, []); // 仅 unmount，不重跑

  // content 防抖保存 — patch 累积到 ref，timer fire 时一次性 flush
  const scheduleSave = (patch: PanelPatch) => {
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const p = pendingPatchRef.current;
      pendingPatchRef.current = {};
      onUpdateRef.current(panel.id, p);
      saveTimerRef.current = null;
    }, 1200);
  };

  // [064] 模组增删（立即持久化）
  const addModule = (m: PanelModule) => {
    const next = [...modules, m];
    setModules(next);
    setAddOpen(false);
    onUpdateRef.current(panel.id, { modules: next });
  };
  const removeModule = (id: string) => {
    const next = modules.filter((m) => m.id !== id);
    setModules(next);
    onUpdateRef.current(panel.id, { modules: next });
  };

  const handleDelete = () => {
    if (confirm(`确定删除面板「${panel.label}」？此操作不可撤销。`)) {
      // 删除时丢弃所有 pending 修改
      if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
      pendingPatchRef.current = {};
      onDelete(panel.id);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        color: "var(--color-text)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 20px",
          borderBottom: "1px solid var(--color-border-soft)",
        }}
      >
        <input
          value={emoji}
          onChange={(e) => {
            const v = e.target.value.slice(0, 3);
            setEmoji(v);
            scheduleSave({ emoji: v });
          }}
          maxLength={3}
          style={{
            width: 32, height: 32, borderRadius: 6,
            border: "1px solid transparent",
            background: "transparent",
            fontSize: 20, textAlign: "center",
            outline: "none",
            color: "var(--color-text)",
            fontFamily: "inherit",
          }}
          onFocus={(e) => ((e.currentTarget.style.border = "1px solid var(--color-border)"))}
          onBlur={(e) => ((e.currentTarget.style.border = "1px solid transparent"))}
          title="面板 emoji（最多 3 字符，兼容旗帜/ZWJ emoji）"
        />
        <input
          value={label}
          onChange={(e) => {
            const v = e.target.value.slice(0, 12);
            setLabel(v);
            scheduleSave({ label: v });
          }}
          placeholder="面板名…"
          maxLength={12}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--color-text)",
            outline: "none",
            fontFamily: "inherit",
            padding: "4px 8px",
            borderRadius: 6,
          }}
          onFocus={(e) => ((e.currentTarget.style.background = "var(--color-surface)"))}
          onBlur={(e) => ((e.currentTarget.style.background = "transparent"))}
        />

        {/* [054] D.2 类型切换 markdown / iframe */}
        <div
          role="group"
          aria-label="面板类型"
          style={{
            display: "inline-flex",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <KindBtn
            active={kind === "markdown"}
            onClick={() => onUpdate(panel.id, { kind: "markdown" })}
            icon={<FileText size={12} />}
            label="笔记"
          />
          <KindBtn
            active={kind === "iframe"}
            onClick={() => onUpdate(panel.id, { kind: "iframe" })}
            icon={<Globe size={12} />}
            label="网页"
          />
          <KindBtn
            active={kind === "modules"}
            onClick={() => onUpdate(panel.id, { kind: "modules" })}
            icon={<LayoutGrid size={12} />}
            label="模组"
          />
          <KindBtn
            active={kind === "generated"}
            onClick={() => onUpdate(panel.id, { kind: "generated", ...(panel.spec ? {} : { spec: SAMPLE_SPEC }) })}
            icon={<Boxes size={12} />}
            label="应用"
          />
        </div>

        {/* edit/preview 切换（仅 markdown 模式有意义）*/}
        {kind === "markdown" && (
          <button
            onClick={() => setMode((m) => (m === "edit" ? "preview" : "edit"))}
            title={mode === "edit" ? "切到预览" : "切到编辑"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 10px", borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text-muted)",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {mode === "edit" ? <><Eye size={12} /> 预览</> : <><Edit3 size={12} /> 编辑</>}
          </button>
        )}
        <button
          onClick={handleDelete}
          title="删除面板"
          aria-label="删除面板"
          style={{
            width: 30, height: 30, borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "var(--color-danger-soft)";
            el.style.color = "var(--color-danger)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "var(--color-bg)";
            el.style.color = "var(--color-text-muted)";
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* [054] D.2 iframe 模式 URL 输入条（始终显示，方便快速换地址）*/}
      {kind === "iframe" && (
        <div
          style={{
            flexShrink: 0,
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px",
            borderBottom: "1px solid var(--color-border-soft)",
            background: "var(--color-surface)",
          }}
        >
          <Globe size={13} color="var(--color-text-muted)" />
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); scheduleSave({ url: e.target.value }); }}
            onBlur={(e) => {
              // blur 时规范化 + 立即保存
              // [055 F#4] 先取消 pending timer + 清累积 patch，避免 1.2s 后用未规范化 URL 覆盖
              const v = normalizeUrl(e.target.value);
              if (v !== e.target.value) {
                setUrl(v);
                if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
                pendingPatchRef.current = {};
                onUpdateRef.current(panel.id, { url: v });
              }
            }}
            placeholder="https://example.com（支持 https/http）"
            style={{
              flex: 1, border: "1px solid var(--color-border)",
              borderRadius: 6, padding: "5px 9px",
              fontSize: 12, color: "var(--color-text)",
              background: "var(--color-bg)",
              outline: "none", fontFamily: "ui-monospace, monospace",
            }}
          />
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflow: kind === "generated" ? "hidden" : "auto", padding: (kind === "iframe" || kind === "generated") ? 0 : "16px 20px", minHeight: 0 }}>
        {kind === "generated" ? (
          <GeneratedPanelView
            spec={panel.spec ?? SAMPLE_SPEC}
            onChange={(spec: GeneratedPanelSpec) =>
              // 同步 spec.title/emoji 到面板 Tab，让 AI 生成的标题立刻反映到导航
              onUpdate(panel.id, {
                spec,
                ...(spec.title ? { label: spec.title } : {}),
                ...(spec.emoji ? { emoji: spec.emoji } : {}),
              })
            }
          />
        ) : kind === "modules" ? (
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {/* 加模组工具条 */}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <button
                onClick={() => setAddOpen((v) => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", borderRadius: 999,
                  border: "1px dashed var(--color-border)",
                  background: addOpen ? "var(--color-primary-soft)" : "var(--color-surface)",
                  color: addOpen ? "var(--color-primary)" : "var(--color-text-muted)",
                  fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Plus size={13} /> 加模组
              </button>
              {addOpen && (
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20,
                    display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4,
                    padding: 6, width: 280,
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-modal)",
                  }}
                >
                  {MODULE_PRESETS.map((p) => (
                    <button
                      key={p.type}
                      onClick={() => addModule(p.make())}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        padding: "8px 10px", borderRadius: 8, border: "none",
                        background: "transparent", color: "var(--color-text)",
                        fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-bg)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                    >
                      <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 模组堆叠（2 列网格自适应）*/}
            {modules.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 10, padding: "48px 24px", color: "var(--color-text-faint)", textAlign: "center",
                border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)",
              }}>
                <LayoutGrid size={40} />
                <p style={{ fontSize: 13, margin: 0 }}>空白仪表盘 — 点「加模组」拼装，或让 Butler 帮你组合</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {modules.map((m) => (
                  <ModuleRenderer key={m.id} module={m} ctx={dataCtx} onRemove={() => removeModule(m.id)} />
                ))}
              </div>
            )}
          </div>
        ) : kind === "iframe" ? (
          url.trim() ? (
            <iframe
              src={normalizeUrl(url)}
              title={panel.label}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              style={{
                width: "100%", height: "100%", border: "none",
                background: "var(--color-bg)",
              }}
            />
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              height: "100%", color: "var(--color-text-faint)", gap: 10,
              padding: 32, textAlign: "center",
            }}>
              <Globe size={40} />
              <p style={{ fontSize: 13, margin: 0 }}>填上方 URL 即可嵌入网页</p>
              <p style={{ fontSize: 11, margin: 0, display: "inline-flex", alignItems: "center", gap: 5, color: "var(--color-warning)" }}>
                <AlertTriangle size={11} /> 多数大型站点设置了 X-Frame-Options 会拒绝嵌入
              </p>
            </div>
          )
        ) : mode === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              scheduleSave({ content: e.target.value });
            }}
            placeholder="支持 Markdown：# 标题、- 列表、**加粗**、`code`、表格…"
            style={{
              width: "100%",
              minHeight: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--color-text)",
              background: "transparent",
              fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace",
            }}
          />
        ) : content.trim() ? (
          <div className="ai-md" style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text)" }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", color: "var(--color-text-faint)", gap: 10,
          }}>
            {/* [056] 插画替代 icon */}
            <EmptyPanel size={150} />
            <p style={{ fontSize: 13, margin: 0 }}>面板还没内容，点击右上「编辑」开始写</p>
          </div>
        )}
      </div>
    </div>
  );
}
