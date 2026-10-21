import { uiText } from "../messages.ts";
// ============================================================
// lib/ocr/providers.ts — OCR 服务商注册表
//
// 类似 ai-models.ts：可切换 OCR provider，价格 / 接入难度透明。
// 当前仅实现 Mistral；DeepSeek-VL / Tesseract 留接口位。
//
// 选用 provider：环境变量 OCR_PROVIDER=mistral（默认）/ deepseek-vl / tesseract
// ============================================================

export type OcrProviderId = "mistral" | "deepseek-vl" | "tesseract";

export interface OcrProviderMeta {
  id: OcrProviderId;
  label: string;
  /** 人话价格 */
  pricing: string;
  /** 需要的环境变量名（null = 不需要） */
  needsEnvKey: string | null;
  /** 成本档：low / mid / high */
  tier: "low" | "mid" | "high";
  /** 描述 + 适用场景 */
  desc: string;
  /** 是否已实现接入（false = 占位） */
  implemented: boolean;
}

export const OCR_PROVIDERS: OcrProviderMeta[] = [
  {
    id: "mistral",
    label: "Mistral OCR",
    get pricing() { return uiText("ocr.metadata.pricing"); },
    needsEnvKey: "MISTRAL_API_KEY",
    tier: "low",
    get desc() { return uiText("ocr.metadata.consent"); },
    implemented: true,
  },
  {
    id: "deepseek-vl",
    get label() { return uiText("ocr.metadata.deepseek"); },
    get pricing() { return uiText("ocr.metadata.unavailable"); },
    needsEnvKey: "DEEPSEEK_API_KEY",
    tier: "low",
    get desc() { return uiText("ocr.metadata.unimplemented"); },
    implemented: false,
  },
  {
    id: "tesseract",
    get label() { return uiText("ocr.metadata.tesseract"); },
    get pricing() { return uiText("ocr.metadata.unavailable"); },
    needsEnvKey: null,
    tier: "low",
    get desc() { return uiText("ocr.metadata.localMissing"); },
    implemented: false,
  },
];

export const DEFAULT_OCR_PROVIDER: OcrProviderId = "mistral";

export function getOcrProviderMeta(id: OcrProviderId): OcrProviderMeta {
  return OCR_PROVIDERS.find((p) => p.id === id) ?? OCR_PROVIDERS[0];
}

export function isValidOcrProviderId(id: string): id is OcrProviderId {
  return OCR_PROVIDERS.some((p) => p.id === id);
}
