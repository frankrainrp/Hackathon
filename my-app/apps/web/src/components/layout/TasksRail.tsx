"use client";
import { uiText } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";


// ============================================================
// components/layout/TasksRail.tsx
// LeftRail @ Tasks Tab — 真实计数 + 可点击切换 view
// ============================================================

import React from "react";
import { Plus, Inbox, Clock, CheckCircle2, ListTodo, AlertCircle } from "lucide-react";
import { RailPrimaryBtn, RailGroupTitle, RailItem } from "./LeftRail";

export type TaskViewId = "active" | "upcoming" | "all" | "completed" | "in_progress";

export interface TaskCounts {
  active: number;
  upcoming: number;
  all: number;
  completed: number;
  in_progress: number;
}

interface TasksRailProps {
  onCreateTask: () => void;
  counts: TaskCounts;
  view: TaskViewId;
  onSelectView: (v: TaskViewId) => void;
}

function CountBadge({ n }: { n: number }) {
  const uiLanguage = useCopyLanguage().lang;
  if (n === 0) return null;
  return (
    <span
      style={{
        fontSize: 11,
        color: "var(--color-text-faint)",
        fontWeight: 500,
        minWidth: 18,
        textAlign: "right",
      }}
    >
      {n}
    </span>
  );
}

export default function TasksRail({ onCreateTask, counts, view, onSelectView }: TasksRailProps) {
  const uiLanguage = useCopyLanguage().lang;
  return (
    <>
      <RailPrimaryBtn icon={<Plus size={14} />} label={uiText("ui.tasksrail.718e58cc20")} onClick={onCreateTask} />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <RailGroupTitle>{uiText("ui.tasksrail.69c404591e")}</RailGroupTitle>
        <RailItem
          icon={<Inbox size={14} />} label={uiText("ui.tasksrail.9234069589")}
          active={view === "active"}
          badge={<CountBadge n={counts.active} />}
          onClick={() => onSelectView("active")}
        />
        <RailItem
          icon={<AlertCircle size={14} />} label={uiText("ui.tasksrail.b4cc4b07c3")}
          active={view === "in_progress"}
          badge={<CountBadge n={counts.in_progress} />}
          onClick={() => onSelectView("in_progress")}
        />
        <RailItem
          icon={<Clock size={14} />} label={uiText("ui.tasksrail.5f1a2542e4")}
          active={view === "upcoming"}
          badge={<CountBadge n={counts.upcoming} />}
          onClick={() => onSelectView("upcoming")}
        />
        <RailItem
          icon={<ListTodo size={14} />} label={uiText("ui.tasksrail.0799351bbf")}
          active={view === "all"}
          badge={<CountBadge n={counts.all} />}
          onClick={() => onSelectView("all")}
        />
        <RailItem
          icon={<CheckCircle2 size={14} />} label={uiText("ui.tasksrail.22a970d2e5")}
          active={view === "completed"}
          badge={<CountBadge n={counts.completed} />}
          onClick={() => onSelectView("completed")}
        />
      </div>
    </>
  );
}
