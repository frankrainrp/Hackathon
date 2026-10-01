"use client";

// ============================================================
// components/panel-modules/ModuleRenderer.tsx — [064] 单个模组渲染
// 按 module.type 分发：统计卡/倒计时/任务清单/饼图/柱状图/热力图。
// 数据绑定走 lib/panel-data（从真实 ddls/notes/streak 现算）。
// ============================================================

import React from "react";
import { Trash2, GripVertical } from "lucide-react";
import type { PanelModule } from "@/lib/types";
import {
  type PanelDataCtx,
  resolveStat, resolveSeries, resolveHeatmap, resolveTasks, resolveCountdown,
} from "@/lib/panel-data";
import { PieChart, BarChart, Heatmap } from "./Charts";

function ModuleCard({
  title, children, onRemove,
}: { title?: string; children: React.ReactNode; onRemove?: () => void }) {
  return (
    <div
      style={{
        position: "relative",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: 16,
      }}
    >
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>{title}</h3>
        </div>
      )}
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="移除模组"
          title="移除模组"
          style={{
            position: "absolute", top: 10, right: 10,
            width: 24, height: 24, borderRadius: 6, border: "none",
            background: "transparent", color: "var(--color-text-faint)", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "var(--color-danger-soft)"; el.style.color = "var(--color-danger)"; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "transparent"; el.style.color = "var(--color-text-faint)"; }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

export default function ModuleRenderer({
  module: m, ctx, onRemove,
}: { module: PanelModule; ctx: PanelDataCtx; onRemove?: () => void }) {
  const cfg = m.config ?? {};

  switch (m.type) {
    case "stat": {
      const { value, label } = resolveStat(cfg.metric, ctx);
      return (
        <ModuleCard title={m.title} onRemove={onRemove}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="font-display" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: "var(--color-primary)" }}>
              {value}
            </span>
            {cfg.unit && <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{cfg.unit}</span>}
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "6px 0 0" }}>{m.title ? label : label}</p>
        </ModuleCard>
      );
    }
    case "countdown": {
      const cd = resolveCountdown(cfg.targetDate, ctx);
      return (
        <ModuleCard title={m.title ?? "倒计时"} onRemove={onRemove}>
          {cd ? (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="font-display" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: cd.days < 0 ? "var(--color-danger)" : cd.days <= 3 ? "var(--color-warning)" : "var(--color-primary)" }}>
                  {Math.abs(cd.days)}
                </span>
                <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{cd.days < 0 ? "天前已过" : cd.days === 0 ? "就在今天" : "天后"}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "6px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {cd.label} · {cd.date}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--color-text-faint)", margin: 0 }}>暂无未来截止任务</p>
          )}
        </ModuleCard>
      );
    }
    case "tasklist": {
      const tasks = resolveTasks(cfg.filter, ctx, cfg.limit ?? 6);
      return (
        <ModuleCard title={m.title ?? "任务清单"} onRemove={onRemove}>
          {tasks.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--color-text-faint)", margin: 0 }}>暂无任务</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tasks.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: (t.status ?? (t.completed ? "done" : "todo")) === "done" ? "var(--color-success)" : "var(--color-primary)", flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text)", textDecoration: t.completed ? "line-through" : "none" }}>
                    {t.taskName}
                  </span>
                  {t.dueDate && <span style={{ fontSize: 11, color: "var(--color-text-faint)" }}>{t.dueDate.slice(5)}</span>}
                </div>
              ))}
            </div>
          )}
        </ModuleCard>
      );
    }
    case "pie": {
      const data = cfg.metric ? resolveSeries(cfg.metric, ctx, cfg.data) : (cfg.data ?? []);
      return <ModuleCard title={m.title ?? "饼图"} onRemove={onRemove}><PieChart data={data} /></ModuleCard>;
    }
    case "bar": {
      const data = cfg.metric ? resolveSeries(cfg.metric, ctx, cfg.data) : (cfg.data ?? []);
      return <ModuleCard title={m.title ?? "柱状图"} onRemove={onRemove}><BarChart data={data} /></ModuleCard>;
    }
    case "heatmap": {
      const days = resolveHeatmap(ctx);
      return <ModuleCard title={m.title ?? "任务热力图"} onRemove={onRemove}><Heatmap days={days} /></ModuleCard>;
    }
    default:
      return null;
  }
}
