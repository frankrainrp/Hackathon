"use client";
import { formatDate } from "@/lib/messages";
import { uiText } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";


// ============================================================
// components/layout/CalendarRail.tsx
// LeftRail @ Calendar Tab — 含可交互迷你月历（C1）
// ============================================================

import React, { useMemo, useState } from "react";
import { Plus, CalendarDays, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import type { DdlItem } from "@/lib/types";
import { RailPrimaryBtn, RailGroupTitle, RailItem } from "./LeftRail";

interface CalendarRailProps {
  onCreateEvent: () => void;
  /** C1 迷你月历:有事件的日期数据源 */
  ddls?: DdlItem[];
  /** 点击迷你月历某天 → page.tsx 切 Calendar 进入 Day View */
  onJumpToDay?: (iso: string) => void;
}

const WEEK_LABELS = () => [uiText("ui.calendarrail.51a75f4634"), uiText("ui.calendarrail.084b42f6e9"), uiText("ui.calendarrail.a4c3313deb"), uiText("ui.calendarrail.754a9d5828"), uiText("ui.calendarrail.c9b87f516a"), uiText("ui.calendarrail.de07b53838"), uiText("ui.calendarrail.85217f7aff")];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMiniMonth(cursor: Date): { cells: { iso: string; day: number; isCurMonth: boolean }[]; label: string } {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1);
  // 周一为首列：weekday 0=日 → 6, 1=一 → 0...
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - offset);
  const cells: { iso: string; day: number; isCurMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ iso: isoDate(d), day: d.getDate(), isCurMonth: d.getMonth() === m });
  }
  return { cells, label: formatDate(cursor, { year: "numeric", month: "short" }) };
}

export default function CalendarRail({ onCreateEvent, ddls = [], onJumpToDay }: CalendarRailProps) {
  const uiLanguage = useCopyLanguage().lang;
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const { cells, label } = useMemo(() => buildMiniMonth(cursor), [cursor, uiLanguage]);
  const todayIso = isoDate(new Date());
  const ddlDateSet = useMemo(() => new Set(ddls.filter((d) => d.dueDate).map((d) => d.dueDate)), [ddls, uiLanguage]);

  const prev = () => { const n = new Date(cursor); n.setMonth(n.getMonth() - 1); setCursor(n); };
  const next = () => { const n = new Date(cursor); n.setMonth(n.getMonth() + 1); setCursor(n); };

  return (
    <>
      {/* C1 迷你月历 */}
      <div
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          padding: 8,
          fontFamily: "inherit",
        }}
      >
        {/* 月份切换 */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
            padding: "0 2px",
          }}
        >
          <button
            onClick={prev}
            aria-label={uiText("ui.calendarrail.692c48b73e")}
            style={miniNavBtn()}
          >
            <ChevronLeft size={11} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text)" }}>{label}</span>
          <button
            onClick={next}
            aria-label={uiText("ui.calendarrail.4d5a52448a")}
            style={miniNavBtn()}
          >
            <ChevronRight size={11} />
          </button>
        </header>

        {/* 周标题 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 0,
            marginBottom: 2,
          }}
        >
          {WEEK_LABELS().map((w) => (
            <div
              key={w}
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "var(--color-text-faint)",
                textAlign: "center",
                padding: "2px 0",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日期格 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
          {cells.map((c) => {
            const isToday = c.iso === todayIso;
            const hasEvent = ddlDateSet.has(c.iso);
            return (
              <button
                key={c.iso}
                onClick={() => onJumpToDay?.(c.iso)}
                title={c.iso + (hasEvent ? uiText("ui.calendarrail.941147739c") : "")}
                style={{
                  position: "relative",
                  fontSize: 10,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday
                    ? "white"
                    : c.isCurMonth
                    ? "var(--color-text)"
                    : "var(--color-text-faint)",
                  background: isToday ? "var(--color-primary)" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 0",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  height: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  if (!isToday) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-primary-soft)";
                }}
                onMouseLeave={(e) => {
                  if (!isToday) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {c.day}
                {hasEvent && !isToday && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 2,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <RailPrimaryBtn icon={<Plus size={14} />} label={uiText("ui.calendarrail.d1a6a27bd0")} onClick={onCreateEvent} />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <RailGroupTitle>{uiText("ui.calendarrail.e0b2b00cf3")}</RailGroupTitle>
        <RailItem icon={<CalendarDays size={14} />} label={uiText("ui.calendarrail.4bd028c242")} active />
        <RailItem icon={<Layers size={14} />} label={uiText("ui.calendarrail.3ff5620b02")} />
      </div>
    </>
  );
}

function miniNavBtn(): React.CSSProperties {
  return {
    width: 20,
    height: 20,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "var(--color-text-muted)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    fontFamily: "inherit",
  };
}
