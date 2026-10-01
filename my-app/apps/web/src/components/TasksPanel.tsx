"use client";

// ============================================================
// components/TasksPanel.tsx — 「每日任务」面板
// Stage C.1：视觉重做（墨绿设计语言，去玻璃 / 去 DecoLayered）
// ============================================================

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Check, FileText, Users, Inbox, Plus, Pencil, Trash2,
  CalendarPlus, Download, Upload, Link2, FolderOpen,
  Image as ImageIcon, File as FileIcon, Paperclip, Repeat,
} from "lucide-react";
import type { DdlItem, DdlAttachment, TaskPriority, TaskStatus } from "@/lib/types";
import type { TaskViewId } from "./layout/TasksRail";
import { EmptyTasks, EmptyFilter } from "./EmptyIllustrations";
import { useIsMobile } from "@/lib/use-is-mobile";

interface Props {
  ddls: DdlItem[];
  onToggleComplete: (id: string) => void;
  onRequestCreate: () => void;
  /** #16 推荐每日任务：一键直接添加（不开编辑器） */
  onQuickAdd?: (title: string) => void;
  onRequestEdit: (ddl: DdlItem) => void;
  onRequestDelete: (id: string) => void;
  onRequestPreview: (att: DdlAttachment) => void;
  /** 点击「📝 备注」chip 时打开 markdown 预览 */
  onRequestNotesPreview: (item: DdlItem) => void;
  onExportIcs: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  /** G1.4 .ics 课表导入 */
  onImportIcs?: () => void;
  /** [079] 打开周期任务管理 */
  onOpenRecurring?: () => void;
  view: TaskViewId;
  /** B3 全局搜索跳转后高亮指定 task,触发 CSS 闪烁动画 + scrollIntoView */
  highlightTaskId?: string | null;
}

const VIEW_TITLE: Record<TaskViewId, string> = {
  active: "Active",
  in_progress: "In Progress",
  upcoming: "Upcoming",
  all: "All Tasks",
  completed: "Completed",
};

/** 把 ddls 按当前 view 过滤 */
function filterByView(ddls: DdlItem[], view: TaskViewId): DdlItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return ddls.filter((d) => {
    const status = effectiveStatus(d);
    if (view === "active") return status !== "done";
    if (view === "in_progress") return status === "in_progress";
    if (view === "completed") return status === "done";
    if (view === "upcoming") {
      if (status === "done") return false;
      if (!d.dueDate) return false;
      return new Date(d.dueDate) >= today;
    }
    return true; // all
  });
}

function effectiveStatus(d: DdlItem): TaskStatus {
  if (d.status) return d.status;
  return d.completed ? "done" : "todo";
}

// Epic 4.2 紧急度色彩(deadline 距今天数派生,优先于 priority)
function computeUrgency(d: DdlItem): { color: string; title: string } | null {
  if (d.completed || (d.status ?? "todo") === "done") return null;
  if (d.dueDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(d.dueDate);
    const days = (due.getTime() - today.getTime()) / 86400000;
    if (days < 0) return { color: "var(--color-danger)", title: `已逾期 ${Math.abs(Math.floor(days))} 天` };
    if (days < 1) return { color: "var(--color-danger)", title: "今日截止" };
    if (days < 3) return { color: "#ea580c",            title: `${Math.ceil(days)} 天内截止` };
    if (days < 7) return { color: "var(--color-warning)", title: `${Math.ceil(days)} 天内截止` };
    return { color: "var(--color-success)", title: `${Math.ceil(days)} 天后截止` };
  }
  // 无 deadline 退回 priority
  if (d.priority) {
    return { color: PRIORITY_META[d.priority].color, title: `优先级 ${PRIORITY_META[d.priority].label}` };
  }
  return null;
}

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: "高", color: "var(--color-danger)" },
  med: { label: "中", color: "var(--color-warning)" },
  low: { label: "低", color: "var(--color-info)" },
};

type GroupKey = "tbd" | "today" | "thisWeek" | "later" | "done";

const GROUP_META: Record<GroupKey, { label: string; color: string }> = {
  tbd:      { label: "待定",   color: "var(--color-warning)" },
  today:    { label: "今天",   color: "var(--color-danger)" },
  thisWeek: { label: "本周",   color: "var(--color-warning)" },
  later:    { label: "之后",   color: "var(--color-primary)" },
  done:     { label: "已完成", color: "var(--color-success)" },
};

function classifyGroup(ddl: DdlItem): GroupKey {
  if (ddl.completed) return "done";
  if (!ddl.dueDate) return "tbd";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(ddl.dueDate);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return "today";
  if (diff <= 7) return "thisWeek";
  return "later";
}

export default function TasksPanel({
  ddls, onToggleComplete, onRequestCreate, onQuickAdd, onRequestEdit, onRequestDelete,
  onRequestPreview, onRequestNotesPreview, onExportIcs, onExportJson, onImportJson, onImportIcs, onOpenRecurring, view,
  highlightTaskId,
}: Props) {
  const isMobile = useIsMobile();
  const filteredDdls = useMemo(() => filterByView(ddls, view), [ddls, view]);

  // B3 高亮目标 row 时 scrollIntoView（CSS 闪烁由 className 控制）
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (highlightTaskId) {
      const el = rowRefs.current[highlightTaskId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightTaskId]);

  const grouped = useMemo(() => {
    const g: Record<GroupKey, DdlItem[]> = { tbd: [], today: [], thisWeek: [], later: [], done: [] };
    for (const ddl of filteredDdls) g[classifyGroup(ddl)].push(ddl);
    for (const k of Object.keys(g) as GroupKey[]) {
      g[k].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    return g;
  }, [filteredDdls]);

  const totalActive = ddls.filter((d) => effectiveStatus(d) !== "done").length;
  const totalDone = ddls.filter((d) => effectiveStatus(d) === "done").length;

  // Epic 4.4 按 tag 聚合统计 — 顶部 chip cloud
  const tagStats = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {};
    for (const d of ddls) {
      const tags = d.tags ?? [];
      for (const t of tags) {
        if (!counts[t]) counts[t] = { total: 0, done: 0 };
        counts[t].total++;
        if (effectiveStatus(d) === "done") counts[t].done++;
      }
    }
    return Object.entries(counts)
      .map(([tag, s]) => ({ tag, ...s }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [ddls]);

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: isMobile ? "16px 12px 24px" : "28px 32px 40px",
        background: "transparent",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text)",
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              {VIEW_TITLE[view]}
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                margin: "4px 0 0",
              }}
            >
              {filteredDdls.length > 0
                ? `当前视图 ${filteredDdls.length} 项 · 全部 ${ddls.length}（${totalActive} 待办 / ${totalDone} 已完成）`
                : "当前视图无任务 — 切换左侧 View 或上传课件 / 对 Butler 说话创建"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {onOpenRecurring && (
              <ToolbarBtn onClick={onOpenRecurring} icon={<Repeat size={13} />} label="周期任务" tooltip="管理重复任务（如每周健身 4 次），每到新周期自动生成" compact={isMobile} />
            )}
            <ToolbarBtn onClick={onExportIcs} icon={<CalendarPlus size={13} />} label="订阅日历" tooltip="下载 .ics → 导入手机/电脑系统日历自动提醒" compact={isMobile} />
            <ToolbarBtn onClick={onExportJson} icon={<Download size={13} />} label="导出" tooltip="导出全部任务为 JSON 文件备份" compact={isMobile} />
            <ToolbarBtn onClick={onImportJson} icon={<Upload size={13} />} label="导入 JSON" tooltip="从 JSON 文件合并任务（按 ID 去重）" compact={isMobile} />
            {onImportIcs && (
              <ToolbarBtn onClick={onImportIcs} icon={<CalendarPlus size={13} />} label="导入 ICS" tooltip="从 .ics 课表文件批量导入事件" compact={isMobile} />
            )}
            <PrimaryBtn onClick={onRequestCreate} icon={<Plus size={14} />} label={isMobile ? "新建" : "New Task"} />
          </div>
        </header>

        {/* Epic 4.4 tag chip 聚合(完成率显示) */}
        {tagStats.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {tagStats.map((t) => {
              const ratio = t.total > 0 ? Math.round((t.done / t.total) * 100) : 0;
              return (
                <span
                  key={t.tag}
                  title={`#${t.tag} · ${t.done}/${t.total} 已完成`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontFamily: "inherit",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                    #{t.tag}
                  </span>
                  <span>{t.done}/{t.total}</span>
                  <span
                    style={{
                      width: 28, height: 3,
                      borderRadius: 2,
                      background: "var(--color-border)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 0, left: 0, height: "100%",
                        width: `${ratio}%`,
                        background: ratio === 100 ? "var(--color-success)" : "var(--color-primary)",
                      }}
                    />
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {ddls.length === 0 ? (
          <EmptyState onCreate={onRequestCreate} onQuickAdd={onQuickAdd} />
        ) : filteredDdls.length === 0 ? (
          <ViewEmptyState viewTitle={VIEW_TITLE[view]} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {(["tbd", "today", "thisWeek", "later", "done"] as GroupKey[]).map((key) => {
              const items = grouped[key];
              if (items.length === 0) return null;
              return (
                <TaskGroup
                  key={key}
                  groupKey={key}
                  items={items}
                  onToggle={onToggleComplete}
                  onEdit={onRequestEdit}
                  onDelete={onRequestDelete}
                  onPreview={onRequestPreview}
                  onNotesPreview={onRequestNotesPreview}
                  highlightId={highlightTaskId ?? null}
                  rowRefs={rowRefs}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 分组
// ============================================================
function TaskGroup({
  groupKey, items, onToggle, onEdit, onDelete, onPreview, onNotesPreview,
  highlightId, rowRefs,
}: {
  groupKey: GroupKey;
  items: DdlItem[];
  onToggle: (id: string) => void;
  onEdit: (ddl: DdlItem) => void;
  onDelete: (id: string) => void;
  onPreview: (att: DdlAttachment) => void;
  onNotesPreview: (item: DdlItem) => void;
  highlightId?: string | null;
  rowRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const meta = GROUP_META[groupKey];
  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: meta.color,
          }}
        />
        <h2
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-text-muted)",
            margin: 0,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {meta.label}
        </h2>
        <span
          style={{
            fontSize: 11,
            color: "var(--color-text-faint)",
            fontWeight: 500,
          }}
        >
          {items.length}
        </span>
      </div>
      <div
        style={{
          // [085] 卡片用更深的底，配边框 + 阴影，和较亮的面板拉开层次（立体）
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 4px 14px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.02)",
        }}
      >
        {items.map((item, idx) => (
          <TaskRow
            key={item.id}
            item={item}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onPreview={onPreview}
            onNotesPreview={onNotesPreview}
            isLast={idx === items.length - 1}
            highlight={item.id === highlightId}
            rowRef={(el) => { if (rowRefs) rowRefs.current[item.id] = el; }}
          />
        ))}
      </div>
    </section>
  );
}

// ============================================================
// 单条任务
// ============================================================
function TaskRow({
  item, onToggle, onEdit, onDelete, onPreview, onNotesPreview, isLast, highlight, rowRef,
}: {
  item: DdlItem;
  onToggle: (id: string) => void;
  onEdit: (ddl: DdlItem) => void;
  onDelete: (id: string) => void;
  onPreview: (att: DdlAttachment) => void;
  onNotesPreview: (item: DdlItem) => void;
  isLast: boolean;
  highlight?: boolean;
  rowRef?: (el: HTMLDivElement | null) => void;
}) {
  const [hov, setHov] = useState(false);
  const displayDate = formatDate(item.dueDate);
  return (
    <div
      ref={rowRef}
      className={highlight ? "task-row-flash" : ""}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--color-border-soft)",
        background: hov ? "var(--color-surface)" : "transparent",
        transition: "background 0.12s",
      }}
    >
      <Checkbox checked={item.completed} onClick={() => onToggle(item.id)} />

      {/* Epic 4.2 紧急度色块(deadline 优先,无 deadline 则用 priority,都无则不显示) */}
      {(() => {
        const u = computeUrgency(item);
        if (!u) return null;
        return (
          <span
            title={u.title}
            style={{
              width: 3,
              height: 28,
              borderRadius: 2,
              background: u.color,
              flexShrink: 0,
            }}
          />
        );
      })()}

      <div
        style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
        onClick={() => onEdit(item)}
        title="点击编辑"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: item.completed ? "var(--color-text-faint)" : "var(--color-text)",
              textDecoration: item.completed ? "line-through" : "none",
            }}
          >
            {item.taskName}
          </span>
          {effectiveStatus(item) === "in_progress" && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--color-warning)",
                background: "color-mix(in srgb, var(--color-warning) 12%, transparent)",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              进行中
            </span>
          )}
          {item.isGroupWork && (
            <span title="小组作业" style={{ display: "inline-flex", color: "var(--color-info)" }}>
              <Users size={12} />
            </span>
          )}
          {item.weight !== null && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--color-primary)",
                background: "var(--color-primary-soft)",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              {item.weight}%
            </span>
          )}
          {item.tags?.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 10,
                color: "var(--color-text-muted)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              #{t}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            {displayDate} · {item.dueTime}
          </span>
          {item.description && (
            <span
              style={{
                fontSize: 11,
                color: "var(--color-text-faint)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.description}
            </span>
          )}
        </div>
        {(item.attachments?.length || item.notes) && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {item.notes && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNotesPreview(item);
                }}
                title="点击查看完整备注"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "color-mix(in srgb, var(--color-warning) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-warning) 24%, transparent)",
                  fontSize: 10,
                  color: "var(--color-warning)",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                📝 备注
              </button>
            )}
            {item.attachments?.map((att) => (
              <AttachmentChip
                key={att.id}
                att={att}
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(att);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 2,
          opacity: hov ? 1 : 0,
          transition: "opacity 0.15s",
          pointerEvents: hov ? "auto" : "none",
        }}
      >
        <RowIconBtn label="编辑" onClick={() => onEdit(item)}>
          <Pencil size={12} />
        </RowIconBtn>
        <RowIconBtn
          label="删除"
          danger
          onClick={() => {
            if (confirm(`删除「${item.taskName}」？`)) onDelete(item.id);
          }}
        >
          <Trash2 size={12} />
        </RowIconBtn>
      </div>

      <span
        title={`来源：${item.source}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 10,
          color: "var(--color-text-faint)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-soft)",
          padding: "3px 8px",
          borderRadius: 4,
          maxWidth: 140,
          flexShrink: 0,
        }}
      >
        <FileText size={10} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.source}
        </span>
      </span>
    </div>
  );
}

function AttachmentChip({ att, onClick }: { att: DdlAttachment; onClick: (e: React.MouseEvent) => void }) {
  const [h, setH] = useState(false);
  const Icon = att.kind === "url" ? Link2
    : att.kind === "filepath" ? FolderOpen
    : (att.mime?.startsWith("image/") ? ImageIcon
      : (att.mime?.includes("pdf") || att.label.toLowerCase().endsWith(".pdf")) ? FileText
      : FileIcon);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={att.ref}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 4,
        background: h ? "var(--color-primary-soft)" : "var(--color-surface)",
        border: "1px solid var(--color-border)",
        fontSize: 10,
        color: "var(--color-text)",
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        maxWidth: 160,
        overflow: "hidden",
      }}
    >
      <Paperclip size={9} color="var(--color-primary)" style={{ flexShrink: 0 }} />
      <Icon size={10} color="var(--color-primary)" style={{ flexShrink: 0 }} />
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {att.label}
      </span>
    </button>
  );
}

function RowIconBtn({
  children, onClick, label, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        border: "none",
        background: h
          ? (danger ? "color-mix(in srgb, var(--color-danger) 12%, transparent)" : "var(--color-primary-soft)")
          : "transparent",
        color: h
          ? (danger ? "var(--color-danger)" : "var(--color-primary)")
          : "var(--color-text-faint)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ============================================================
// 复选框
// ============================================================
function Checkbox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  // 勾选完成时弹跳一下（配 task-complete 服务铃，观察.txt #1：音效配 UI 动画）
  const [popping, setPopping] = useState(false);
  const prevChecked = useRef(checked);
  useEffect(() => {
    if (checked && !prevChecked.current) {
      setPopping(true);
      const t = setTimeout(() => setPopping(false), 450);
      prevChecked.current = checked;
      return () => clearTimeout(t);
    }
    prevChecked.current = checked;
  }, [checked]);
  return (
    <button
      onClick={onClick}
      aria-label={checked ? "标记未完成" : "标记完成"}
      className={popping ? "fx-pop" : undefined}
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        border: `1.5px solid ${checked ? "var(--color-success)" : "var(--color-border)"}`,
        background: checked ? "var(--color-success)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 0.15s",
      }}
    >
      {checked && <Check size={11} color="white" strokeWidth={3} />}
    </button>
  );
}

// ============================================================
// 工具栏按钮
// ============================================================
function ToolbarBtn({
  icon, label, tooltip, onClick, compact,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  /** 手机：仅图标方块，节省顶部空间 */
  compact?: boolean;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={tooltip}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: compact ? 0 : "7px 10px",
        width: compact ? 36 : undefined,
        height: compact ? 36 : undefined,
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        background: h ? "var(--color-primary-soft)" : "var(--color-bg)",
        color: h ? "var(--color-primary)" : "var(--color-text-muted)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
      }}
    >
      {icon}
      {!compact && label}
    </button>
  );
}

// 主操作按钮（墨绿实色）
function PrimaryBtn({
  icon, label, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: h ? "var(--color-primary-hover)" : "var(--color-primary)",
        color: "white",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.15s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================
// 空状态
// ============================================================
// #16 推荐每日任务：降低启动门槛，一键添加
const RECOMMENDED_TASKS = [
  "复习今天的笔记 25 分钟",
  "规划明天的 3 件事",
  "整理待办收件箱",
  "运动 / 散步 15 分钟",
  "读 10 页书",
];

function EmptyState({ onCreate, onQuickAdd }: { onCreate: () => void; onQuickAdd?: (title: string) => void }) {
  return (
    <div
      style={{
        background: "var(--color-bg)",
        border: "1px dashed var(--color-border)",
        borderRadius: 12,
        padding: "48px 24px 32px",
        textAlign: "center",
      }}
    >
      {/* [056] 插画替代 icon */}
      <div style={{ marginBottom: 14 }}>
        <EmptyTasks size={180} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", margin: "0 0 6px" }}>
        还没有任何任务
      </p>
      <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 8px" }}>
        切到 <strong style={{ color: "var(--color-text)" }}>Chat</strong> 上传课件，或点下方按钮手动添加
      </p>
      {/* Epic 6.5 管家小气泡 */}
      <p
        style={{
          fontSize: 12,
          fontStyle: "italic",
          color: "var(--color-primary)",
          background: "var(--color-primary-soft)",
          padding: "6px 12px",
          borderRadius: 14,
          display: "inline-block",
          margin: "0 0 16px",
        }}
      >
        ☕「放假了？让我陪你休息一下」— Butler
      </p>

      {/* #16 推荐任务：一键启动，降低门槛 */}
      {onQuickAdd && (
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--color-text-faint)", margin: "0 0 8px" }}>
            管家推荐 · 点一下即添加
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 460, margin: "0 auto" }}>
            {RECOMMENDED_TASKS.map((t) => (
              <RecommendChip key={t} label={t} onClick={() => onQuickAdd(t)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <PrimaryBtn onClick={onCreate} icon={<Plus size={14} />} label="New Task" />
      </div>
    </div>
  );
}

function RecommendChip({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${hov ? "var(--color-primary)" : "var(--color-border)"}`,
        background: hov ? "var(--color-primary-soft)" : "var(--color-surface)",
        color: hov ? "var(--color-primary)" : "var(--color-text)",
        fontSize: 12.5,
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
      }}
    >
      <Plus size={12} />
      {label}
    </button>
  );
}

function ViewEmptyState({ viewTitle }: { viewTitle: string }) {
  return (
    <div
      style={{
        background: "var(--color-bg)",
        border: "1px dashed var(--color-border)",
        borderRadius: 12,
        padding: "28px 24px",
        textAlign: "center",
      }}
    >
      {/* [056] 漏斗插画：视图筛选为空 */}
      <div style={{ marginBottom: 8 }}><EmptyFilter size={88} /></div>
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0 }}>
        当前视图「{viewTitle}」下没有任务
      </p>
      <p style={{ fontSize: 12, color: "var(--color-text-faint)", margin: "6px 0 0" }}>
        切换左侧 Views 看其他视图
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "待定";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === -1) return "昨天";
  if (diff > 0 && diff < 7) return `${diff} 天后`;
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}
