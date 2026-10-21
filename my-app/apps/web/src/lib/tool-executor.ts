
import { uiText } from "./messages.ts";
// ============================================================
// lib/tool-executor.ts — AI tool_call 执行器
//
// 设计原则（v2，2026-05-22 起）：
//   - create / update / delete  → 不直接改 ddls，而是产出 PendingChange 入待核实队列
//   - toggle_complete          → 直接执行（用户高频低风险）
//   - list_items               → 直接执行（只读）
//
// 回执文案使用"建议..."而非"已..."，让 AI 明确告诉用户「需要核实」。
// ============================================================

import type { DdlItem, Note, CustomPanel, RecurringTask } from "./types";
import type { ApiToolCall } from "./chat-client";
import {
  compactItem,
  type ToolCall,
  type ToolResult,
  type CreateItemArgs,
  type UpdateItemArgs,
  type DeleteItemArgs,
  type ToggleCompleteArgs,
  type ListItemsArgs,
  type CreateNoteArgs,
  type CreateCustomPanelArgs,
  type CreateRecurringTaskArgs,
} from "./ai-tools";
import { makeChangeId, type PendingChange } from "./pending";
import { makeRecurring, CADENCE_LABEL } from "./recurring";

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export interface ToolExecutorDeps {
  getDdls: () => DdlItem[];
  setDdls: React.Dispatch<React.SetStateAction<DdlItem[]>>;
  /** 把一个"待核实"改动追加到当前批次（page.tsx 注入） */
  addPending: (change: PendingChange) => void;
  /** [079] 创建周期任务（page.tsx 注入：落库 + 立即生成当期实例）*/
  addRecurring?: (routine: RecurringTask) => void;
}

export function createToolExecutor(deps: ToolExecutorDeps) {
  return async (call: ApiToolCall): Promise<ToolResult> => {
    let args: unknown;
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch {
      return { ok: false, message: uiText("ui.toolexecutor.94d6ec5f01", { value0: call.function.arguments }) };
    }

    switch (call.function.name as ToolCall["name"]) {
      case "create_item":
        return execCreate(args as CreateItemArgs, deps);
      case "update_item":
        return execUpdate(args as UpdateItemArgs, deps);
      case "delete_item":
        return execDelete(args as DeleteItemArgs, deps);
      case "toggle_complete":
        return execToggle(args as ToggleCompleteArgs, deps);
      case "list_items":
        return execList(args as ListItemsArgs, deps);
      case "create_note":
        return execCreateNote(args as CreateNoteArgs, deps);
      case "create_custom_panel":
        return execCreateCustomPanel(args as CreateCustomPanelArgs, deps);
      case "create_recurring_task":
        return execCreateRecurring(args as CreateRecurringTaskArgs, deps);
      default:
        return { ok: false, message: uiText("ui.toolexecutor.c5187c04a4", { value0: call.function.name }) };
    }
  };
}

// ============================================================
// 1. create_item → PendingCreate（不入库，待核实）
// ============================================================
function execCreate(args: CreateItemArgs, { addPending }: ToolExecutorDeps): ToolResult {
  if (!args.taskName) {
    return { ok: false, message: uiText("ui.toolexecutor.4ee9eda09f") };
  }
  const dueDate = args.dueDate ?? "";
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { ok: false, message: uiText("ui.toolexecutor.83b54dfe1e", { value0: dueDate }) };
  }
  const status = args.status ?? "todo";
  const draft: DdlItem = {
    id: uid(),
    taskName: args.taskName,
    weight: args.weight ?? null,
    dueDate,
    dueTime: args.dueTime || "23:59",
    description: args.description || "",
    isGroupWork: args.isGroupWork ?? false,
    source: uiText("ui.toolexecutor.eee78fc268"),
    completed: status === "done",
    status,
    ...(args.tags && args.tags.length > 0 ? { tags: args.tags } : {}),
    ...(args.priority ? { priority: args.priority } : {}),
    ...(args.notes ? { notes: args.notes } : {}),
  };
  const dateLabel = draft.dueDate || uiText("ui.toolexecutor.63ec276c63");
  addPending({
    id: makeChangeId(),
    kind: "create",
    summary: `${draft.taskName} · ${dateLabel}${draft.dueTime ? " " + draft.dueTime : ""}`,
    draft,
  });
  return {
    ok: true,
    message: uiText("ui.toolexecutor.2fc3d1a544", { value0: draft.taskName, value1: dateLabel }),
    data: compactItem(draft),
  };
}

// ============================================================
// 2. update_item → PendingUpdate（不入库，待核实）
// ============================================================
function execUpdate(args: UpdateItemArgs, { getDdls, addPending }: ToolExecutorDeps): ToolResult {
  const target = findItem(getDdls(), args.itemId, args.taskNameFuzzy);
  if (!target) {
    return {
      ok: false,
      message: uiText("ui.toolexecutor.b21ac5811b", { value0: args.itemId, value1: args.taskNameFuzzy }),
    };
  }
  if (args.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(args.dueDate)) {
    return { ok: false, message: uiText("ui.toolexecutor.93fc1e9a33", { value0: args.dueDate }) };
  }

  const patch: Partial<DdlItem> = {
    ...(args.taskName !== undefined ? { taskName: args.taskName } : {}),
    ...(args.dueDate !== undefined ? { dueDate: args.dueDate } : {}),
    ...(args.dueTime !== undefined ? { dueTime: args.dueTime } : {}),
    ...(args.weight !== undefined ? { weight: args.weight } : {}),
    ...(args.description !== undefined ? { description: args.description } : {}),
    ...(args.isGroupWork !== undefined ? { isGroupWork: args.isGroupWork } : {}),
    ...(args.status !== undefined ? { status: args.status, completed: args.status === "done" } : {}),
    ...(args.tags !== undefined ? { tags: args.tags } : {}),
    ...(args.priority !== undefined ? { priority: args.priority } : {}),
    ...(args.notes !== undefined ? { notes: args.notes } : {}),
  };
  if (Object.keys(patch).length === 0) {
    return { ok: false, message: uiText("ui.toolexecutor.b7f755e48f") };
  }

  addPending({
    id: makeChangeId(),
    kind: "update",
    targetId: target.id,
    before: target,
    patch,
    summary: `${target.taskName}`,
  });

  return {
    ok: true,
    message: uiText("ui.toolexecutor.a2a33b9bbc", { value0: target.taskName }),
    data: compactItem({ ...target, ...patch }),
  };
}

// ============================================================
// 3. delete_item → PendingDelete（不入库，待核实）
// ============================================================
function execDelete(args: DeleteItemArgs, { getDdls, addPending }: ToolExecutorDeps): ToolResult {
  const target = findItem(getDdls(), args.itemId, args.taskNameFuzzy);
  if (!target) {
    return {
      ok: false,
      message: uiText("ui.toolexecutor.add02ffc65", { value0: args.itemId, value1: args.taskNameFuzzy }),
    };
  }
  addPending({
    id: makeChangeId(),
    kind: "delete",
    targetId: target.id,
    before: target,
    summary: `${target.taskName}`,
  });
  return {
    ok: true,
    message: uiText("ui.toolexecutor.8998450882", { value0: target.taskName }),
    data: { id: target.id },
  };
}

// ============================================================
// 4. toggle_complete → 直接执行（用户高频低风险，不走核实）
// ============================================================
function execToggle(args: ToggleCompleteArgs, { getDdls, setDdls }: ToolExecutorDeps): ToolResult {
  const target = findItem(getDdls(), args.itemId, args.taskNameFuzzy);
  if (!target) {
    return { ok: false, message: uiText("ui.toolexecutor.1242d9b3c5") };
  }
  const nextCompleted = args.completed !== undefined ? args.completed : !target.completed;
  setDdls((prev) => prev.map((it) => (it.id === target.id ? { ...it, completed: nextCompleted } : it)));
  return {
    ok: true,
    message: nextCompleted ? uiText("ui.toolexecutor.cff48eda87", { value0: target.taskName }) : uiText("ui.toolexecutor.abdeba607c", { value0: target.taskName }),
    data: { id: target.id, completed: nextCompleted },
  };
}

// ============================================================
// 5. list_items → 直接执行（只读）
// ============================================================
function execList(args: ListItemsArgs, { getDdls }: ToolExecutorDeps): ToolResult {
  const all = getDdls();
  const filter = args.filter || "all";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = all.filter((d) => {
    if (filter === "all") return true;
    if (filter === "active") return !d.completed;
    if (filter === "completed") return d.completed;
    const due = new Date(d.dueDate);
    const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
    if (filter === "today") return diff === 0 && !d.completed;
    if (filter === "thisWeek") return diff >= 0 && diff <= 7 && !d.completed;
    if (filter === "later") return diff > 7 && !d.completed;
    return true;
  });

  return {
    ok: true,
    message: uiText("ui.toolexecutor.a28cd03f92", { value0: filtered.length }),
    data: filtered.map(compactItem),
  };
}

// ============================================================
// 6. create_note → PendingCreateNote（待核实，B2 跨面板联动）
// ============================================================
function execCreateNote(args: CreateNoteArgs, { addPending }: ToolExecutorDeps): ToolResult {
  if (!args.title || !args.content) {
    return { ok: false, message: uiText("ui.toolexecutor.0a305e9385") };
  }
  const now = Date.now();
  const noteDraft: Note = {
    id: "note-" + uid(),
    title: args.title.slice(0, 60),
    content: args.content,
    ...(args.tags && args.tags.length > 0 ? { tags: args.tags } : {}),
    createdAt: now,
    updatedAt: now,
  };
  addPending({
    id: makeChangeId(),
    kind: "create-note",
    summary: noteDraft.title,
    noteDraft,
  });
  return {
    ok: true,
    message: uiText("ui.toolexecutor.6eeb88792d", { value0: noteDraft.title, value1: noteDraft.content.length }),
    data: { id: noteDraft.id, title: noteDraft.title, length: noteDraft.content.length },
  };
}

// ============================================================
// 7. create_custom_panel → PendingCreateCustomPanel（[054] D.3）
// ============================================================
function execCreateCustomPanel(args: CreateCustomPanelArgs, { addPending }: ToolExecutorDeps): ToolResult {
  if (!args.label || !args.label.trim()) {
    return { ok: false, message: uiText("ui.toolexecutor.862634f8f3") };
  }
  const kind: "markdown" | "iframe" | "modules" =
    args.kind === "iframe" ? "iframe" : args.kind === "modules" ? "modules" : "markdown";
  if (kind === "iframe" && (!args.url || !args.url.trim())) {
    return { ok: false, message: uiText("ui.toolexecutor.22ffe6185f") };
  }
  if (kind === "modules" && (!args.modules || args.modules.length === 0)) {
    return { ok: false, message: uiText("ui.toolexecutor.c3e40d62a8") };
  }
  const now = Date.now();
  // [064] 给每个模组补 id（AI 不传 id）
  const modules =
    kind === "modules" && args.modules
      ? args.modules.map((m) => ({ id: "mod-" + uid(), type: m.type, title: m.title, config: m.config }))
      : undefined;
  const panelDraft: CustomPanel = {
    id: "custom-" + uid(),
    label: args.label.slice(0, 12).trim() || uiText("ui.toolexecutor.4d245a898c"),
    emoji: (args.emoji || "📋").slice(0, 3),
    content: args.content ?? "",
    kind,
    ...(kind === "iframe" && args.url ? { url: args.url.trim() } : {}),
    ...(modules ? { modules } : {}),
    createdAt: now,
    updatedAt: now,
  };
  addPending({
    id: makeChangeId(),
    kind: "create-custom-panel",
    summary: kind === "modules"
      ? uiText("ui.toolexecutor.ec5e7a205d", { value0: panelDraft.emoji, value1: panelDraft.label, value2: modules!.length })
      : `${panelDraft.emoji} ${panelDraft.label}`,
    panelDraft,
  });
  return {
    ok: true,
    message: uiText("ui.toolexecutor.1aa35a5884", { value0: panelDraft.label, value1: kind }),
    data: { id: panelDraft.id, label: panelDraft.label, kind },
  };
}

// ============================================================
// 8. create_recurring_task → 直接建模板 + 立即生成当期（[079]）
// ============================================================
function execCreateRecurring(args: CreateRecurringTaskArgs, { addRecurring }: ToolExecutorDeps): ToolResult {
  if (!args.taskName || !args.taskName.trim()) {
    return { ok: false, message: uiText("ui.toolexecutor.3358504dca") };
  }
  if (args.cadence !== "daily" && args.cadence !== "weekly" && args.cadence !== "monthly") {
    return { ok: false, message: uiText("ui.toolexecutor.4bce584319") };
  }
  if (!addRecurring) {
    return { ok: false, message: uiText("ui.toolexecutor.2cd3f489e6") };
  }
  const times = Math.max(1, Math.min(args.timesPerPeriod || 1, 31));
  const routine = makeRecurring({
    taskName: args.taskName,
    cadence: args.cadence,
    timesPerPeriod: times,
    dueTime: args.dueTime,
    description: args.description,
    tags: args.tags,
    emoji: args.emoji,
  });
  addRecurring(routine);
  const freq = `${CADENCE_LABEL[args.cadence]}${times > 1 ? uiText("ui.toolexecutor.51b51f5c69", { value0: times }) : ""}`;
  return {
    ok: true,
    message: uiText("ui.toolexecutor.5480fcb138", { value0: routine.taskName, value1: freq }),
    data: { id: routine.id, taskName: routine.taskName, cadence: routine.cadence, timesPerPeriod: times },
  };
}

// ============================================================
// helper
// ============================================================
function findItem(ddls: DdlItem[], itemId?: string, fuzzy?: string): DdlItem | null {
  if (itemId) {
    const exact = ddls.find((d) => d.id === itemId);
    if (exact) return exact;
  }
  if (fuzzy) {
    const lower = fuzzy.toLowerCase().trim();
    return ddls.find((d) => d.taskName.toLowerCase().includes(lower)) || null;
  }
  return null;
}
