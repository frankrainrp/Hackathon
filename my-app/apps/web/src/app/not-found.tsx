"use client";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useT();
  return <main style={{ minHeight: "100dvh", display: "grid", placeContent: "center", padding: 24, gap: 16, background: "var(--color-bg)", color: "var(--color-text)" }}>
    <h1 style={{ fontSize: 26, fontWeight: 600 }}>{t("app.notFound")}</h1>
    <p style={{ maxWidth: "54ch", lineHeight: 1.6 }}>{t("app.notFoundBody")}</p>
    <a href="/" style={{ color: "var(--color-info)", textDecoration: "underline" }}>{t("app.openWorkspace")}</a>
  </main>;
}
