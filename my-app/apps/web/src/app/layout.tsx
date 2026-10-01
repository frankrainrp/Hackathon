// ============================================================
// apps/web/src/app/layout.tsx
// 全局根布局 — 挂载 Google Fonts 与全局样式
// ============================================================
import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// 复古模式衬线展示字（小型大写横幅 / 品牌字）
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Butler — 智能多模态学习管家",
  description: "AI-powered multimodal learning hub — 让学习更智能、更高效。",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/assets/logo.png", apple: "/assets/logo.png" },
};

export const viewport = { themeColor: "#D9DFE8" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${cinzel.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
