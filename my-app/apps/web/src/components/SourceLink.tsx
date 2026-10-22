"use client";
import { useState, type ReactNode } from "react";
import { appFetch, uiText } from "@/lib/messages";
import { useToast } from "./Toast";

export default function SourceLink({ href, children }: { href?: string; children: ReactNode }) {
  const [opening, setOpening] = useState(false);
  const toast = useToast();
  if (!href) return <span>{children}</span>;
  return <a href={href} target="_blank" rel="noreferrer" title={uiText("links.openInEdge")} aria-busy={opening} onClick={event => {
    event.preventDefault();
    if (opening) return;
    setOpening(true);
    void appFetch("/api/open-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: href }) })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || uiText("links.failed")); })
      .catch(error => toast.error(error.message || uiText("links.failed")))
      .finally(() => setOpening(false));
  }}>{children}</a>;
}
