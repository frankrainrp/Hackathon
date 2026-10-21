"use client";
import { uiText } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";


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
    get group() { return uiText("ui.keyboardshortcutshelp.63d6b47116"); },
    items: [
      { keys: ["⌘", "K"],  get desc() { return uiText("ui.keyboardshortcutshelp.7635403c26"); } },
      { keys: ["⌘", "N"],  get desc() { return uiText("ui.keyboardshortcutshelp.0319ac7e2e"); } },
      { keys: ["Esc"],      get desc() { return uiText("ui.keyboardshortcutshelp.eeeb3a12c0"); } },
      { keys: ["?"],        get desc() { return uiText("ui.keyboardshortcutshelp.7b6ae8a728"); } },
    ],
  },
  {
    get group() { return uiText("ui.keyboardshortcutshelp.e9f6e87fdf"); },
    items: [
      { keys: ["↑", "↓"],   get desc() { return uiText("ui.keyboardshortcutshelp.0c12930a33"); } },
      { keys: ["Enter"],     get desc() { return uiText("ui.keyboardshortcutshelp.8fe6706fcb"); } },
      { keys: ["Space"],     get desc() { return uiText("ui.keyboardshortcutshelp.91b5dcb6e5"); } },
    ],
  },
  {
    get group() { return uiText("ui.keyboardshortcutshelp.2bdadb307d"); },
    items: [
      { keys: ["Enter"],     get desc() { return uiText("ui.keyboardshortcutshelp.edecf0ae6e"); } },
      { keys: ["Shift", "Enter"], get desc() { return uiText("ui.keyboardshortcutshelp.bd609a8e2d"); } },
      { keys: ["IME"],       get desc() { return uiText("ui.keyboardshortcutshelp.bd63082d8b"); } },
    ],
  },
];

export default function KeyboardShortcutsHelp({ open, onClose }: Props) {
  const uiLanguage = useCopyLanguage().lang;
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
        aria-label={uiText("ui.keyboardshortcutshelp.89ce481a4b")}
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
          <h2 style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>{uiText("ui.keyboardshortcutshelp.89ce481a4b")}</h2>
          <button
            onClick={onClose}
            aria-label={uiText("ui.keyboardshortcutshelp.3fd47edce4")}
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
        >{uiText("ui.keyboardshortcutshelp.8d767a81bf")}</footer>
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
