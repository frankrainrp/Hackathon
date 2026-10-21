
import { uiText } from "./messages.ts";
// ============================================================
// lib/demo-data.ts — 新用户激活:一键填入 3 门课 × 8 任务 + 2 笔记
//
// 全部基于今天 + N 天派生,保证 deadline 是未来日期,看起来真实
// ============================================================

import type { DdlItem, Note } from "./types";

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function isoOffsetDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildDemoData(): { ddls: DdlItem[]; notes: Note[] } {
  const now = Date.now();

  const ddls: DdlItem[] = [
    // ---- C245 数据结构 ----
    {
      id: uid(),
      taskName: uiText("ui.demodata.1ecb3a7df7"),
      weight: 10,
      dueDate: isoOffsetDay(2),
      dueTime: "10:00",
      description: uiText("ui.demodata.3df6808311"),
      isGroupWork: false,
      source: uiText("ui.demodata.7def860cb6"),
      completed: false,
      status: "todo",
      tags: ["C245", "quiz"],
      priority: "med",
    },
    {
      id: uid(),
      taskName: uiText("ui.demodata.d048e86bf9"),
      weight: 25,
      dueDate: isoOffsetDay(10),
      dueTime: "23:59",
      description: uiText("ui.demodata.b753fa3c2f"),
      isGroupWork: true,
      source: uiText("ui.demodata.7def860cb6"),
      completed: false,
      status: "in_progress",
      tags: ["C245", "project"],
      priority: "high",
    },
    {
      id: uid(),
      taskName: uiText("ui.demodata.b4c018f268"),
      weight: null,
      dueDate: isoOffsetDay(1),
      dueTime: "20:00",
      description: uiText("ui.demodata.48a62dc9f8"),
      isGroupWork: false,
      source: uiText("ui.demodata.7def860cb6"),
      completed: false,
      status: "todo",
      tags: ["C245", "reading"],
      priority: "low",
    },
    // ---- ECON101 经济学 ----
    {
      id: uid(),
      taskName: uiText("ui.demodata.e46ee81b85"),
      weight: 15,
      dueDate: isoOffsetDay(5),
      dueTime: "18:00",
      description: uiText("ui.demodata.511d89ee86"),
      isGroupWork: false,
      source: uiText("ui.demodata.7def860cb6"),
      completed: false,
      status: "todo",
      tags: ["ECON101", "paper"],
      priority: "med",
    },
    {
      id: uid(),
      taskName: uiText("ui.demodata.dbb52d4cea"),
      weight: null,
      dueDate: isoOffsetDay(3),
      dueTime: "23:59",
      description: uiText("ui.demodata.baaf3b5fef"),
      isGroupWork: false,
      source: uiText("ui.demodata.7def860cb6"),
      completed: false,
      status: "todo",
      tags: ["ECON101", "reading"],
    },
    {
      id: uid(),
      taskName: uiText("ui.demodata.25c4e18ed7"),
      weight: 40,
      dueDate: isoOffsetDay(28),
      dueTime: "14:00",
      description: uiText("ui.demodata.0cea0033a0"),
      isGroupWork: false,
      source: uiText("ui.demodata.7def860cb6"),
      completed: false,
      status: "todo",
      tags: ["ECON101", "exam"],
      priority: "high",
    },
    // ---- ENG201 学术英语 ----
    {
      id: uid(),
      taskName: uiText("ui.demodata.9be1889177"),
      weight: 20,
      dueDate: isoOffsetDay(7),
      dueTime: "23:59",
      description: uiText("ui.demodata.00ff9b0053"),
      isGroupWork: false,
      source: uiText("ui.demodata.7def860cb6"),
      completed: false,
      status: "todo",
      tags: ["ENG201", "paper"],
      priority: "med",
    },
    {
      id: uid(),
      taskName: uiText("ui.demodata.62481b161e"),
      weight: null,
      dueDate: isoOffsetDay(4),
      dueTime: "15:30",
      description: uiText("ui.demodata.b148331c8e"),
      isGroupWork: false,
      source: uiText("ui.demodata.7def860cb6"),
      completed: false,
      status: "todo",
      tags: ["ENG201"],
      priority: "med",
    },
  ];

  const notes: Note[] = [
    {
      id: "note-" + uid(),
      title: uiText("ui.demodata.48951fd566"),
      content: uiText("ui.demodata.c0865b4831"),
      tags: ["C245", uiText("ui.demodata.00f0efe794")],
      pinned: true,
      createdAt: now - 3 * 86400000,
      updatedAt: now - 2 * 86400000,
    },
    {
      id: "note-" + uid(),
      title: uiText("ui.demodata.a8a15a28ab"),
      content: uiText("ui.demodata.48105482ca"),
      tags: ["ECON101", "paper"],
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
    },
  ];

  return { ddls, notes };
}
