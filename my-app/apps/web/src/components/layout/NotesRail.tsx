"use client";
import { uiText } from "@/lib/messages";
import { useT as useCopyLanguage } from "@/lib/i18n";


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
  const uiLanguage = useCopyLanguage().lang;
  const pinned = notes.filter((n) => n.pinned);
  const total = notes.length;
  return (
    <>
      <RailPrimaryBtn icon={<Plus size={14} />} label={uiText("ui.notesrail.b763c5ea3c")} onClick={onCreate} />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <RailGroupTitle>{uiText("ui.notesrail.dc20b3d5d2")}</RailGroupTitle>
        <RailItem
          icon={<FileText size={14} />}
          label={uiText("ui.notesrail.00a187caec")}
          active
          badge={total > 0 ? <CountBadge n={total} /> : null}
        />
        {pinned.length > 0 && (
          <RailItem
            icon={<Pin size={14} />}
            label={uiText("ui.notesrail.f20c879465")}
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
      >{uiText("ui.notesrail.690d8aa3ab")}<br />
        <span style={{ color: "var(--color-text-muted)" }}>{uiText("ui.notesrail.3ba70f4310")}</span>
      </div>
    </>
  );
}

function CountBadge({ n }: { n: number }) {
  const uiLanguage = useCopyLanguage().lang;
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
