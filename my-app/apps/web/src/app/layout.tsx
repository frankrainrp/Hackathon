// ============================================================
// apps/web/src/app/layout.tsx
// Global layout: bundled font assets keep builds independent of font services.
// ============================================================
import { translate } from "@/lib/messages";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const inter = localFont({
  src: "../../public/fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: "Arial",
});

// 复古模式衬线展示字（小型大写横幅 / 品牌字）
const cinzel = localFont({
  src: "../../public/fonts/cinzel-latin.woff2",
  variable: "--font-cinzel",
  display: "swap",
  weight: "400 900",
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: translate("app.title"),
  description: translate("app.description"),
  manifest: "/manifest.webmanifest",
  icons: { icon: "/assets/logo.png", apple: "/assets/logo.png" },
};

export const viewport = { themeColor: "#ECE3CF" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="retro" className={`${inter.variable} ${cinzel.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
