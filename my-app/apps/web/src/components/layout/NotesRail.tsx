"use client";

// ============================================================
// components/layout/NotesRail.tsx
// LeftRail @ Notes Tab — 简易版（v5 起接 notes 数据）
// ============================================================

import React from "react";
import { Plus, FileText, Pin } from "lucide-react";
import type { Note } from "@/lib/types";
import { RailPrimaryBtn, RailGroupTitle, RailItem } from "./LeftRail";

interface NotesRailProps {
  notes: Note[];
  onCreate: () => void;
}

export default function NotesRail({ notes, onCreate }: NotesRailProps) {
  const pinned = notes.filter((n) => n.pinned);
  const total = notes.length;
  return (
    <>
      <RailPrimaryBtn icon={<Plus size={14} />} label="New Note" onClick={onCreate} />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <RailGroupTitle>Library</RailGroupTitle>
        <RailItem
          icon={<FileText size={14} />}
          label="All Notes"
          active
          badge={total > 0 ? <CountBadge n={total} /> : null}
        />
        {pinned.length > 0 && (
          <RailItem
            icon={<Pin size={14} />}
            label="Pinned"
            badge={<CountBadge n={pinned.length} />}
          />
        )}
      </div>

      <div
        style={{
          marginTop: "auto",
          padding: 10,
          background: "var(--color-primary-soft)",
          border: "1px dashed var(--color-primary)",
          borderRadius: 8,
          fontSize: 11,
          color: "var(--color-primary)",
          lineHeight: 1.4,
        }}
      >
        浏览器内 · Phase 3
        <br />
        <span style={{ color: "var(--color-text-muted)" }}>接 Tauri 后写本地 Vault</span>
      </div>
    </>
  );
}

function CountBadge({ n }: { n: number }) {
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
