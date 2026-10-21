"use client";
import { useT } from "@/lib/i18n";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return <main role="alert" style={{ minHeight: "100dvh", display: "grid", placeContent: "center", padding: 24, gap: 16, background: "var(--color-bg)", color: "var(--color-text)" }}>
    <h1 style={{ fontSize: 26, fontWeight: 600 }}>{t("app.error")}</h1>
    <p style={{ maxWidth: "54ch", lineHeight: 1.6 }}>{t("app.errorBody")}</p>
    <button onClick={reset} style={{ padding: "10px 16px", width: "fit-content", color: "inherit", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8 }}>{t("app.retry")}</button>
    <a href="/" style={{ color: "var(--color-info)", textDecoration: "underline" }}>{t("app.openWorkspace")}</a>
  </main>;
}
