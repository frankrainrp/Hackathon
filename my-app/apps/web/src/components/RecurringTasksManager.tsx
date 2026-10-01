"use client";

// ============================================================
// components/RecurringTasksManager.tsx — 周期任务管理 [079]
//
// 列出所有周期任务模板（开关 / 删除）+ 新增表单。
// 模板每到新周期由管家自动生成实例到任务清单（materializeDue）。
// ============================================================

import React, { useEffect, useState } from "react";
import { X, Plus, Trash2, Repeat, Power } from "lucide-react";
import { useIsMobile } from "@/lib/use-is-mobile";
import type { RecurringTask, RecurringCadence } from "@/lib/types";
import {
  getAllRecurring,
  putRecurring,
  deleteRecurring,
  makeRecurring,
  CADENCE_LABEL,
  RECURRING_EVENT,
} from "@/lib/recurring";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 新增 / 启用模板 → 触发 page 立即 materialize */
  onChanged: () => void;
}

export default function RecurringTasksManager({ open, onClose, onChanged }: Props) {
  const isMobile = useIsMobile();
  const [list, setList] = useState<RecurringTask[]>([]);
  // 新增表单
  const [name, setName] = useState("");
  const [cadence, setCadence] = useState<RecurringCadence>("weekly");
  const [times, setTimes] = useState(1);
  const [dueTime, setDueTime] = useState("23:59");
  const [emoji, setEmoji] = useState("🔁");

  const reload = async () => setList(await getAllRecurring());

  useEffect(() => {
    if (!open) return;
    reload();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener(RECURRING_EVENT, reload);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(RECURRING_EVENT, reload); };
  }, [open, onClose]);

  if (!open) return null;

  const add = async () => {
    if (!name.trim()) return;
    const routine = makeRecurring({ taskName: name, cadence, timesPerPeriod: times, dueTime, emoji });
    await putRecurring(routine);
    setName(""); setTimes(1); setEmoji("🔁");
    await reload();
    onChanged();
  };

  const toggle = async (r: RecurringTask) => {
    // 重新启用 → 清 lastGeneratedPeriod 让当期立即重新生成
    await putRecurring({ ...r, active: !r.active, lastGeneratedPeriod: !r.active ? undefined : r.lastGeneratedPeriod });
    await reload();
    if (!r.active) onChanged();
  };

  const remove = async (id: string) => {
    await deleteRecurring(id);
    await reload();
  };

  const freqLabel = (r: RecurringTask) => `${CADENCE_LABEL[r.cadence]}${r.timesPerPeriod > 1 ? ` ${r.timesPerPeriod} 次` : ""}`;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--color-overlay)", zIndex: 80, animation: "fade-in 0.18s ease-out" }} />
      <div
        role="dialog"
        aria-label="周期任务"
        style={{
          position: "fixed",
          ...(isMobile
            ? { left: 0, right: 0, bottom: 0, maxHeight: "92vh", borderRadius: "20px 20px 0 0", animation: "sheet-up 0.28s cubic-bezier(0.16,1,0.3,1)" }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 480, maxWidth: "94vw", maxHeight: "88vh", borderRadius: 16, animation: "modal-pop 0.22s cubic-bezier(0.16,1,0.3,1)" }),
          display: "flex", flexDirection: "column", overflow: "hidden",
          background: "var(--color-bg)", border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-modal)", zIndex: 81, color: "var(--color-text)",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
          <Repeat size={16} color="var(--color-primary)" />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>周期任务</h2>
            <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", margin: "2px 0 0" }}>每到新周期，管家自动生成到任务清单</p>
          </div>
          <button onClick={onClose} aria-label="关闭" style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </header>

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 新增表单 */}
          <section style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 14, background: "var(--color-surface)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 10px" }}>新增周期任务</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                aria-label="emoji"
                style={{ ...input, width: 46, textAlign: "center", flexShrink: 0 }}
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                placeholder="任务名，如「去健身房」"
                style={{ ...input, flex: 1 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={cadence} onChange={(e) => setCadence(e.target.value as RecurringCadence)} style={{ ...input, width: 90 }}>
                <option value="daily">每天</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
              </select>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)" }}>
                <input
                  type="number" min={1} max={31} value={times}
                  onChange={(e) => setTimes(Math.max(1, Math.min(31, parseInt(e.target.value || "1", 10))))}
                  style={{ ...input, width: 56, textAlign: "center" }}
                />
                次
              </div>
              <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={{ ...input, width: 110 }} />
              <button
                onClick={add}
                disabled={!name.trim()}
                style={{
                  marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: 9, border: "none",
                  background: name.trim() ? "var(--color-primary)" : "var(--color-border)",
                  color: name.trim() ? "#fff" : "var(--color-text-faint)",
                  fontSize: 13, fontWeight: 600, cursor: name.trim() ? "pointer" : "default", fontFamily: "inherit",
                }}
              >
                <Plus size={14} /> 添加
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--color-text-faint)", margin: "8px 0 0", lineHeight: 1.5 }}>
              例：每周 4 次 → 本周一/三/五/日各生成一个；每月 → 按月分布。
            </p>
          </section>

          {/* 列表 */}
          <section>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 8px" }}>
              已有 {list.length} 个
            </p>
            {list.length === 0 ? (
              <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--color-text-faint)", fontSize: 12.5, border: "1px dashed var(--color-border)", borderRadius: 10 }}>
                还没有周期任务。上面加一个，或对管家说「每周去健身房 4 次」。
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {list.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      background: r.active ? "var(--color-surface)" : "var(--color-bg)",
                      opacity: r.active ? 1 : 0.6,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{r.emoji || "🔁"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.taskName}</p>
                      <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                        {freqLabel(r)} · {r.dueTime}
                      </p>
                    </div>
                    <button
                      onClick={() => toggle(r)}
                      title={r.active ? "暂停" : "启用"}
                      style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, border: "1px solid var(--color-border)", background: r.active ? "var(--color-primary-soft)" : "var(--color-bg)", color: r.active ? "var(--color-primary)" : "var(--color-text-faint)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      title="删除"
                      style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-faint)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-pop { from { transform: translate(-50%, -50%) scale(0.96); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes sheet-up { from { transform: translateY(100%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </>
  );
}

const input: React.CSSProperties = {
  boxSizing: "border-box", padding: "8px 10px", borderRadius: 8,
  border: "1px solid var(--color-border)", background: "var(--color-bg)",
  color: "var(--color-text)", fontSize: 13, fontFamily: "inherit", outline: "none",
};
