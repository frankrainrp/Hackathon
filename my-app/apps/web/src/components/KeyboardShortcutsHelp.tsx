"use client";

// ============================================================
// components/KeyboardShortcutsHelp.tsx — 快捷键帮助 modal
//
// 按 ? 弹出（非输入框聚焦时）；Esc 关闭
// ============================================================

import React, { useEffect } from "react";
import { Keyboard, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  group: string;
  items: { keys: string[]; desc: string }[];
}

const SHORTCUTS: ShortcutItem[] = [
  {
    group: "全局",
    items: [
      { keys: ["⌘", "K"],  desc: "聚焦全局搜索" },
      { keys: ["⌘", "N"],  desc: "新建当前 Tab 的项（会话/任务/笔记）" },
      { keys: ["Esc"],      desc: "关闭抽屉 / 弹窗 / 搜索面板" },
      { keys: ["?"],        desc: "显示此帮助面板" },
    ],
  },
  {
    group: "Tasks 面板",
    items: [
      { keys: ["↑", "↓"],   desc: "在任务列表中上下移动选中" },
      { keys: ["Enter"],     desc: "编辑选中任务" },
      { keys: ["Space"],     desc: "切换完成状态" },
    ],
  },
  {
    group: "Chat 输入",
    items: [
      { keys: ["Enter"],     desc: "发送" },
      { keys: ["Shift", "Enter"], desc: "换行" },
      { keys: ["IME"],       desc: "中文选词时回车不发送（自动识别）" },
    ],
  },
];

export default function KeyboardShortcutsHelp({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--color-overlay)",
          zIndex: 90,
          animation: "fade-in 0.18s ease-out",
        }}
      />
      <div
        role="dialog"
        aria-label="键盘快捷键"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 480,
          maxWidth: "92vw",
          maxHeight: "82vh",
          overflowY: "auto",
          background: "var(--color-bg)",
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          border: "1px solid var(--color-border)",
          zIndex: 91,
          animation: "modal-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "16px 18px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <Keyboard size={16} color="var(--color-primary)" />
          <h2 style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
            键盘快捷键
          </h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{
              width: 28, height: 28, borderRadius: 6, border: "none",
              background: "transparent", cursor: "pointer",
              color: "var(--color-text-muted)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          >
            <X size={14} />
          </button>
        </header>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
          {SHORTCUTS.map((g) => (
            <section key={g.group}>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                {g.group}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "6px 0",
                    }}
                  >
                    <div style={{ display: "flex", gap: 4 }}>
                      {it.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 500,
                            fontFamily: "ui-monospace, monospace",
                            color: "var(--color-text)",
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 4,
                            minWidth: 22,
                            textAlign: "center",
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                      {it.desc}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer
          style={{
            padding: "10px 18px",
            borderTop: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            fontSize: 11,
            color: "var(--color-text-faint)",
            textAlign: "center",
          }}
        >
          Mac 用 ⌘ · Windows / Linux 用 Ctrl
        </footer>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-pop {
          from { transform: translate(-50%, -50%) scale(0.96); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
