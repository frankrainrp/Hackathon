"use client";
import { uiText } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";


// ============================================================
// components/DailyBrief.tsx — [065] 每日仪式 · 今日简报
//
// 每天首次打开 Butler 时，管家在 Chat 顶部用一条简报迎接：
// 时段问候 + 今日到期/逾期摘要 + streak + 一键「开始专注」。
// 这是巴甫洛夫式的日常触发点（观察.txt #15/#16），驱动留存。
// 100% 本地数据派生（零 token）。每日只出现一次（page 持久化 lastSeen）。
// ============================================================

import React from "react";
import { X, Timer, Flame, Sparkles } from "lucide-react";
import type { DdlItem } from "@/lib/types";

interface Props {
  ddls: DdlItem[];
  streakDays?: number;
  userName?: string;
  onStartFocus: () => void;
  onJumpToTask?: (id: string) => void;
  onDismiss: () => void;
}

function effStatus(d: DdlItem): "todo" | "in_progress" | "done" {
  return d.status ?? (d.completed ? "done" : "todo");
}
function greetByHour(h: number): string {
  if (h < 5) return uiText("ui.dailybrief.659983ea32");
  if (h < 11) return uiText("ui.dailybrief.3cc2e31eb2");
  if (h < 14) return uiText("ui.dailybrief.fceb19622c");
  if (h < 18) return uiText("ui.dailybrief.552594ef80");
  return uiText("ui.dailybrief.d8e9a7fa20");
}

export default function DailyBrief({ ddls, streakDays = 0, userName = "", onStartFocus, onJumpToTask, onDismiss }: Props) {
  const uiLanguage = useCopyLanguage().lang;
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todo = ddls.filter((d) => effStatus(d) !== "done");
  const todayDue = todo.filter((d) => d.dueDate === iso);
  const overdue = todo.filter((d) => d.dueDate && d.dueDate < iso);
  const nearest = [...todo].filter((d) => d.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;

  // 摘要文案
  const parts: string[] = [];
  if (overdue.length > 0) parts.push(uiText("ui.dailybrief.dc64f958b2", { value0: overdue.length }));
  if (todayDue.length > 0) parts.push(uiText("ui.dailybrief.92c4b28278", { value0: todayDue.length }));
  const summary =
    parts.length > 0
      ? uiText("ui.dailybrief.3d839a34ac", { value0: parts.join("、") })
      : uiText("ui.dailybrief.e92ecfc0fb");
  const suggestion = nearest
    ? uiText("ui.dailybrief.97cb194906", { value0: nearest.taskName })
    : uiText("ui.dailybrief.2dec6d2ebb");

  return (
    <div
      style={{
        flexShrink: 0,
        margin: "12px 16px 0",
        padding: "12px 14px",
        borderRadius: "var(--radius-card)",
        background: "var(--glass-bg-strong)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        position: "relative",
        zIndex: 3,
        animation: "bubble-pop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* 管家锚点 */}
      <span
        style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "var(--color-primary-soft)", color: "var(--color-primary)",
        }}
      >
        <Sparkles size={16} />
      </span>

      {/* 文案 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
            {greetByHour(now.getHours())}，{userName}
          </span>
          {streakDays > 0 && (
            <span
              title={uiText("ui.dailybrief.475b638bf5", { value0: streakDays })}
              style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                background: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
                color: "var(--color-warning)",
              }}
            >
              <Flame size={11} />{uiText("ui.dailybrief.42651e9d3f", { value0: streakDays })}</span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "4px 0 0", lineHeight: 1.5 }}>
          {summary}
          {nearest && (
            <>{uiText("ui.dailybrief.736cfd4510")}<button
                onClick={() => onJumpToTask?.(nearest.id)}
                style={{
                  border: "none", background: "transparent", padding: 0, cursor: "pointer",
                  color: "var(--color-primary)", fontSize: 13, fontFamily: "inherit",
                  textDecoration: "underline", textUnderlineOffset: 2,
                }}
              >
                {nearest.taskName}
              </button>
            </>
          )}
        </p>
        <p style={{ fontSize: 12, color: "var(--color-text-faint)", margin: "4px 0 0" }}>{suggestion}</p>

        {/* 行动按钮 */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={onStartFocus}
            className="glass-btn glass-btn-primary"
            style={{ height: 32, padding: "0 14px", fontSize: 13 }}
          >
            <Timer size={14} />{uiText("ui.dailybrief.033df8fb6e")}</button>
        </div>
      </div>

      {/* 关闭 */}
      <button
        onClick={onDismiss}
        aria-label={uiText("ui.dailybrief.de32e20193")}
        title={uiText("ui.dailybrief.de32e20193")}
        style={{
          width: 26, height: 26, borderRadius: 6, border: "none", flexShrink: 0,
          background: "transparent", color: "var(--color-text-faint)", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
      >
        <X size={14} />
      </button>
    </div>
  );
}
