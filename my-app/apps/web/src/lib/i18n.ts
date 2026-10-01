"use client";

// ============================================================
// lib/i18n.ts — 轻量国际化（中英切换）
//
// 设计：
//   - 字典 DICT[lang][key]，扁平点号 key
//   - getStoredLang / setStoredLang（localStorage + <html lang> + LANG_EVENT）
//   - useT() hook：订阅 LANG_EVENT，语言切换时全局组件重渲
//   - translate(key, lang, params?)：非 hook 场景（含 {name} 插值）
//
// 范围（本轮）：核心 UI 框架 —— 顶栏 / 导航 / 偏好设置 / 定价 / 结账 / 账单。
//   面板内长文案分批后续补；缺失 key 自动回退中文再回退 key 本身，永不裸崩。
// ============================================================

import { useCallback, useEffect, useState } from "react";

export type Lang = "zh" | "en";

export const LANG_KEY = "butler.lang";
export const LANG_EVENT = "butler:lang-change";

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "zh";
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

/** 设置语言：写 localStorage + <html lang> + 广播事件（所有 useT 重渲）*/
export function setStoredLang(lang: Lang) {
  if (typeof document === "undefined") return;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* silent */
  }
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  window.dispatchEvent(new CustomEvent(LANG_EVENT));
}

/** 启动注入：把 <html lang> 同步成存储值（layout 默认 zh-CN，英文用户需校正）*/
export function applyStoredLang() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = getStoredLang() === "en" ? "en" : "zh-CN";
}

type Dict = Record<string, string>;

// ============================================================
// 字典
// ============================================================
const ZH: Dict = {
  // 通用
  "common.upgrade": "升级",
  "common.cancel": "取消",
  "common.close": "关闭",
  "common.back": "返回",
  "common.confirm": "确认",
  "common.new": "新建",
  "common.comingSoon": "敬请期待",
  "common.month": "月",
  "common.year": "年",

  // 导航
  "nav.chat": "对话",
  "nav.courses": "课程",
  "nav.tasks": "任务",
  "nav.calendar": "日历",
  "nav.notes": "笔记",
  "nav.newPanel": "新建自定义面板",

  // 顶栏
  "topbar.search": "搜索任务 / 笔记 / 对话…",
  "topbar.tools": "学习工具",
  "topbar.toolsOpen": "打开学习工具",
  "topbar.toolsClose": "关闭学习工具",
  "topbar.notifications": "通知",
  "topbar.preferences": "偏好设置",
  "topbar.achievements": "成就收藏室",
  "topbar.billing": "账单管理",
  "topbar.upgradeCta": "升级到 Pro",
  "topbar.logout": "退出登录",
  "topbar.openNav": "打开侧栏",

  // 主题
  "theme.light": "亮色",
  "theme.dark": "暗色",
  "theme.retro": "复古",
  "theme.switch": "切换主题",

  // 偏好设置
  "prefs.title": "偏好设置",
  "prefs.section.theme": "主题",
  "prefs.section.accent": "主题色",
  "prefs.section.font": "字体大小",
  "prefs.section.language": "语言",
  "prefs.section.layout": "布局",
  "prefs.section.sound": "音效",
  "prefs.section.butler": "管家形象",
  "prefs.section.wallpaper": "壁纸",
  "prefs.section.personality": "管家性格",
  "prefs.font.sm": "小",
  "prefs.font.md": "标准",
  "prefs.font.lg": "大",
  "prefs.language.zh": "中文",
  "prefs.language.en": "English",
  "prefs.language.hint": "切换界面主语言（中文 / English），立即生效",
  "prefs.footer": "所有设置仅保存在你的浏览器",
  "personality.gentle": "温柔",
  "personality.standard": "标准",
  "personality.sassy": "损友",

  // 定价页
  "pricing.title": "选择适合你的计划",
  "pricing.subtitle": "随时升级或降级。演示模式下不会产生任何真实费用。",
  "pricing.monthly": "按月",
  "pricing.annual": "按年",
  "pricing.annualSave": "省 20%",
  "pricing.perMonth": "/ 月",
  "pricing.free": "免费",
  "pricing.billedAnnually": "按年计费 {amount}",
  "pricing.billedMonthly": "按月计费",
  "pricing.current": "当前计划",
  "pricing.mostPopular": "最受欢迎",
  "pricing.getPlan": "升级到 {plan}",
  "pricing.downgradeTo": "降级到 {plan}",
  "pricing.stayFree": "继续使用免费版",
  "pricing.yourPlan": "你的当前计划",

  // 计划名 & 标语
  "plan.free.name": "Free",
  "plan.free.tagline": "随手开始，够用就好",
  "plan.pro.name": "Pro",
  "plan.pro.tagline": "解锁全部模型与无限创作",
  "plan.max.name": "Max",
  "plan.max.tagline": "为重度用户准备的最高配",

  // 计划功能
  "feat.free.1": "每日 20 条 AI 对话",
  "feat.free.2": "DeepSeek V4 Flash 模型",
  "feat.free.3": "1 个自定义面板",
  "feat.free.4": "任务 / 日历 / 笔记基础功能",
  "feat.free.5": "数据本地存储",
  "feat.pro.1": "无限 AI 对话",
  "feat.pro.2": "全部模型（思考模式 / Claude / GPT / Gemini）",
  "feat.pro.3": "无限自定义面板 + 数据模组",
  "feat.pro.4": "自定义壁纸 / 视频背景",
  "feat.pro.5": "PDF / 课件 OCR 自动提取 DDL",
  "feat.pro.6": "优先邮件支持",
  "feat.max.1": "包含 Pro 全部功能",
  "feat.max.2": "最高额度 + 并发处理",
  "feat.max.3": "新功能抢先体验",
  "feat.max.4": "专属管家形象定制",
  "feat.max.5": "API 访问（预留）",
  "feat.max.6": "1 对 1 优先支持",

  // 结账
  "checkout.title": "完成升级",
  "checkout.demoBanner": "🔒 演示模式：这是模拟支付页，不会真实扣款，请勿填写真实卡号。",
  "checkout.orderSummary": "订单摘要",
  "checkout.plan": "计划",
  "checkout.billing": "计费周期",
  "checkout.total": "合计",
  "checkout.cardNumber": "卡号",
  "checkout.expiry": "有效期",
  "checkout.cvc": "安全码",
  "checkout.cardName": "持卡人姓名",
  "checkout.email": "邮箱",
  "checkout.payNow": "支付 {amount}",
  "checkout.processing": "正在处理…",
  "checkout.success": "升级成功！",
  "checkout.successDesc": "你现在是 {plan} 用户，感谢支持 🎉",
  "checkout.done": "完成",
  "checkout.cardPlaceholder": "4242 4242 4242 4242",
  "checkout.namePlaceholder": "如卡面所示",
  "checkout.fillDemo": "一键填入演示卡号",

  // 账单管理
  "billing.title": "账单与计划",
  "billing.currentPlan": "当前计划",
  "billing.renews": "下次续费 {date}",
  "billing.freeForever": "免费版 · 无需付费",
  "billing.viewPlans": "查看全部计划",
  "billing.manage": "管理计划",
  "billing.paymentMethod": "支付方式",
  "billing.noPaymentMethod": "未绑定支付方式",
  "billing.cardOnFile": "尾号 {last4} · {brand}",
  "billing.invoices": "账单历史",
  "billing.noInvoices": "暂无账单记录",
  "billing.cancelPlan": "取消订阅",
  "billing.cancelConfirm": "确定取消订阅并降级到免费版？",
  "billing.cancelled": "已取消订阅，降级到免费版",
  "billing.demoNote": "演示模式 · 所有交易均为模拟，不涉及真实资金",
  "billing.invoice.date": "日期",
  "billing.invoice.plan": "计划",
  "billing.invoice.amount": "金额",
  "billing.invoice.status": "状态",
  "billing.status.paid": "已支付",
};

const EN: Dict = {
  "common.upgrade": "Upgrade",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.back": "Back",
  "common.confirm": "Confirm",
  "common.new": "New",
  "common.comingSoon": "Coming soon",
  "common.month": "month",
  "common.year": "year",

  "nav.chat": "Chat",
  "nav.courses": "Courses",
  "nav.tasks": "Tasks",
  "nav.calendar": "Calendar",
  "nav.notes": "Notes",
  "nav.newPanel": "New custom panel",

  "topbar.search": "Search tasks / notes / chats…",
  "topbar.tools": "Study tools",
  "topbar.toolsOpen": "Open study tools",
  "topbar.toolsClose": "Close study tools",
  "topbar.notifications": "Notifications",
  "topbar.preferences": "Preferences",
  "topbar.achievements": "Achievements",
  "topbar.billing": "Billing",
  "topbar.upgradeCta": "Upgrade to Pro",
  "topbar.logout": "Log out",
  "topbar.openNav": "Open sidebar",

  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.retro": "Retro",
  "theme.switch": "Switch theme",

  "prefs.title": "Preferences",
  "prefs.section.theme": "Theme",
  "prefs.section.accent": "Accent color",
  "prefs.section.font": "Font size",
  "prefs.section.language": "Language",
  "prefs.section.layout": "Layout",
  "prefs.section.sound": "Sound",
  "prefs.section.butler": "Butler avatar",
  "prefs.section.wallpaper": "Wallpaper",
  "prefs.section.personality": "Butler personality",
  "prefs.font.sm": "Small",
  "prefs.font.md": "Default",
  "prefs.font.lg": "Large",
  "prefs.language.zh": "中文",
  "prefs.language.en": "English",
  "prefs.language.hint": "Switch the primary interface language. Applies instantly.",
  "prefs.footer": "All settings are stored only in your browser",
  "personality.gentle": "Gentle",
  "personality.standard": "Standard",
  "personality.sassy": "Sassy",

  "pricing.title": "Choose the plan that fits you",
  "pricing.subtitle": "Upgrade or downgrade anytime. No real charges in demo mode.",
  "pricing.monthly": "Monthly",
  "pricing.annual": "Annual",
  "pricing.annualSave": "Save 20%",
  "pricing.perMonth": "/ mo",
  "pricing.free": "Free",
  "pricing.billedAnnually": "Billed {amount} annually",
  "pricing.billedMonthly": "Billed monthly",
  "pricing.current": "Current plan",
  "pricing.mostPopular": "Most popular",
  "pricing.getPlan": "Get {plan}",
  "pricing.downgradeTo": "Downgrade to {plan}",
  "pricing.stayFree": "Stay on Free",
  "pricing.yourPlan": "Your current plan",

  "plan.free.name": "Free",
  "plan.free.tagline": "Start in seconds, good enough to get going",
  "plan.pro.name": "Pro",
  "plan.pro.tagline": "Unlock every model and unlimited creation",
  "plan.max.name": "Max",
  "plan.max.tagline": "Top tier for power users",

  "feat.free.1": "20 AI messages per day",
  "feat.free.2": "DeepSeek V4 Flash model",
  "feat.free.3": "1 custom panel",
  "feat.free.4": "Core tasks, calendar & notes",
  "feat.free.5": "Local data storage",
  "feat.pro.1": "Unlimited AI messages",
  "feat.pro.2": "All models (Thinking, Claude, GPT, Gemini)",
  "feat.pro.3": "Unlimited custom panels & data modules",
  "feat.pro.4": "Custom wallpaper & video background",
  "feat.pro.5": "PDF & courseware OCR for auto DDLs",
  "feat.pro.6": "Priority email support",
  "feat.max.1": "Everything in Pro",
  "feat.max.2": "Highest limits & concurrency",
  "feat.max.3": "Early access to new features",
  "feat.max.4": "Bespoke butler avatar",
  "feat.max.5": "API access (reserved)",
  "feat.max.6": "1:1 priority support",

  "checkout.title": "Complete upgrade",
  "checkout.demoBanner": "🔒 Demo mode: this is a simulated checkout. No real charge — do not enter a real card.",
  "checkout.orderSummary": "Order summary",
  "checkout.plan": "Plan",
  "checkout.billing": "Billing cycle",
  "checkout.total": "Total",
  "checkout.cardNumber": "Card number",
  "checkout.expiry": "Expiry",
  "checkout.cvc": "CVC",
  "checkout.cardName": "Name on card",
  "checkout.email": "Email",
  "checkout.payNow": "Pay {amount}",
  "checkout.processing": "Processing…",
  "checkout.success": "Upgrade complete!",
  "checkout.successDesc": "You're now on {plan}. Thanks for the support 🎉",
  "checkout.done": "Done",
  "checkout.cardPlaceholder": "4242 4242 4242 4242",
  "checkout.namePlaceholder": "As shown on card",
  "checkout.fillDemo": "Fill demo card",

  "billing.title": "Billing & plans",
  "billing.currentPlan": "Current plan",
  "billing.renews": "Renews {date}",
  "billing.freeForever": "Free plan · no payment needed",
  "billing.viewPlans": "View all plans",
  "billing.manage": "Manage plan",
  "billing.paymentMethod": "Payment method",
  "billing.noPaymentMethod": "No payment method on file",
  "billing.cardOnFile": "•••• {last4} · {brand}",
  "billing.invoices": "Invoice history",
  "billing.noInvoices": "No invoices yet",
  "billing.cancelPlan": "Cancel subscription",
  "billing.cancelConfirm": "Cancel subscription and downgrade to Free?",
  "billing.cancelled": "Subscription cancelled, downgraded to Free",
  "billing.demoNote": "Demo mode · all transactions are simulated, no real money involved",
  "billing.invoice.date": "Date",
  "billing.invoice.plan": "Plan",
  "billing.invoice.amount": "Amount",
  "billing.invoice.status": "Status",
  "billing.status.paid": "Paid",
};

const DICT: Record<Lang, Dict> = { zh: ZH, en: EN };

/** 取译文：缺失 key 回退中文，再回退 key 本身。支持 {name} 插值。*/
export function translate(key: string, lang: Lang, params?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? DICT.zh[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

/** 组件内：返回 t() + 当前 lang + setLang，语言变化时自动重渲 */
export function useT(): { t: TFunc; lang: Lang; setLang: (l: Lang) => void } {
  const [lang, setLangState] = useState<Lang>("zh");
  useEffect(() => {
    setLangState(getStoredLang());
    const onChange = () => setLangState(getStoredLang());
    window.addEventListener(LANG_EVENT, onChange);
    return () => window.removeEventListener(LANG_EVENT, onChange);
  }, []);
  const t = useCallback<TFunc>((key, params) => translate(key, lang, params), [lang]);
  return { t, lang, setLang: setStoredLang };
}
