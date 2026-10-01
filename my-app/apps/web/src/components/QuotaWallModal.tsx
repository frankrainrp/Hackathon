"use client";

// ============================================================
// components/QuotaWallModal.tsx — [087] 免费额度耗尽 softwall
//
// 当前 5h 窗口免费额度（¥0.6）用尽时弹出。永远给"继续免费"出口（切回 Flash），
// 绝不让用户撞墙流失。详见 Doc/变现方案.md §2.3。
// ============================================================

import React, { useEffect, useState } from "react";
import { Crown, Zap, Wallet, X, Clock } from "lucide-react";
import { formatCountdown, WINDOW_BUDGET } from "@/lib/usage";

interface QuotaWallModalProps {
  open: boolean;
  /** 下次额度回满时间戳 */
  resetAt: number;
  /** 是否可降级到 Flash 继续免费（当前模型非 Flash 时为 true）*/
  canFallbackFlash: boolean;
  /** 切回 Flash 继续免费 */
  onSwitchFlash: () => void;
  /** 充值钱包（暂复用定价页，P5 接真钱包后改）*/
  onTopUp: () => void;
  /** 开会员 */
  onUpgrade: () => void;
  onClose: () => void;
}

export default function QuotaWallModal({
  open, resetAt, canFallbackFlash, onSwitchFlash, onTopUp, onUpgrade, onClose,
}: QuotaWallModalProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, [open]);

  if (!open) return null;
  const reset = formatCountdown(resetAt, now);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)", borderRadius: "var(--radius-card)",
          background: "var(--color-bg)", border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card-hover)", overflow: "hidden",
          fontFamily: "inherit",
        }}
      >
        {/* header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--color-border-soft)", position: "relative" }}>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{
              position: "absolute", top: 14, right: 14, width: 28, height: 28,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, border: "none", background: "transparent", cursor: "pointer",
              color: "var(--color-text-muted)",
            }}
          >
            <X size={16} />
          </button>
          <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 8 }}>🔥</div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
            本时段免费额度用完了
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "6px 0 0", lineHeight: 1.5 }}>
            你这阵和 Butler 聊得火热。每 5 小时免费额度（¥{WINDOW_BUDGET.toFixed(1)}）会回满，
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--color-text)", fontWeight: 600 }}>
              <Clock size={12} /> {reset} 后回满
            </span>
            。现在想继续：
          </p>
        </div>

        {/* options */}
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {canFallbackFlash && (
            <OptionRow
              icon={<Zap size={18} />}
              title="切回 DeepSeek Flash"
              desc="依然免费，日常对话/任务管理足够用"
              primary
              badge="推荐"
              onClick={onSwitchFlash}
            />
          )}
          <OptionRow
            icon={<Wallet size={18} />}
            title="充值钱包，按量继续"
            desc="按真实用量计费（成本 ×1.3），随用随扣"
            onClick={onTopUp}
          />
          <OptionRow
            icon={<Crown size={18} />}
            title="开会员，更高额度 + 全模型解锁"
            desc="折合单价比按量省 ~25%，Pro/Max 自动解锁高端模型"
            onClick={onUpgrade}
          />
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  icon, title, desc, primary, badge, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  primary?: boolean;
  badge?: string;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        padding: "12px 14px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
        borderRadius: 12,
        border: primary ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
        background: primary
          ? (hov ? "var(--color-primary-soft)" : "color-mix(in srgb, var(--color-primary) 7%, transparent)")
          : (hov ? "var(--color-surface)" : "transparent"),
        transition: "all 0.15s",
      }}
    >
      <span style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: 9,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: primary ? "var(--color-primary)" : "var(--color-surface)",
        color: primary ? "#fff" : "var(--color-text-muted)",
      }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{title}</span>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
              background: "var(--color-primary)", color: "#fff",
            }}>{badge}</span>
          )}
        </span>
        <span style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, lineHeight: 1.4 }}>
          {desc}
        </span>
      </span>
    </button>
  );
}
