import { uiText } from "./messages.ts";
import { contextPlan, estimatedModelGiB } from "./ai-context.ts";
import { RETIRED_MODEL_CATALOG } from "./ai-legacy-catalog.ts";
// Reviewed metadata, pinned to official publisher revisions. Weights are never bundled/downloaded automatically.
export const CATALOG_VERSION = "2026-10-22.2";
export interface CatalogModel {
  id: string; repo: string; revision: string; file: string; bytes: number; sha256: string;
  label: string; minRamGiB: number; workingGiB: number; context: number; layers: number; kvHeads: number; headDim: number; license: string;
  capability: string; limitations: string; source: string;
  parametersB?: number; minContext?: number; preferredContext?: number; preference?: number;
  cacheGroups?: { layers: number; kvHeads: number; headDim: number; window?: number }[];
  evidence?: { reviewed: string; modelCard: string; evaluation: string; community: string; status: "public-evidence" };
}
// Preference reflects capability evidence, never file size or parameter count.
export const MODEL_CATALOG: CatalogModel[] = [
  {"id":"gemma4-12-qat","repo":"google/gemma-4-12B-it-qat-q4_0-gguf","revision":"29d097773436b69ff9feafd636ab4cf873786537","file":"gemma-4-12b-it-qat-q4_0.gguf","bytes":6975879296,"sha256":"93567e57a8fe10b23569b9d9ec38cd005deedf71e29477c421a4b83f418a538b","label":"Gemma 4 12B · QAT Q4_0","parametersB":11.95,"minRamGiB":16,"workingGiB":9.5,"context":262144,"minContext":8192,"preferredContext":16384,"layers":48,"kvHeads":8,"headDim":512,"cacheGroups":[{"layers":8,"kvHeads":8,"headDim":512},{"layers":40,"kvHeads":8,"headDim":256,"window":1024}],"preference":60,"evidence":{"reviewed":"2026-10-22","modelCard":"https://huggingface.co/google/gemma-4-12B-it","evaluation":"https://artificialanalysis.ai/models/gemma-4-12b","community":"https://www.reddit.com/r/LocalLLaMA/comments/1vkmhyl/best_local_llms_august_2026/","status":"public-evidence"},"license":"Apache-2.0","source":"https://huggingface.co/google/gemma-4-12B-it-qat-q4_0-gguf", get capability() { return uiText("ai.curated.gemma"); }, get limitations() { return uiText("ai.curated.gemmaLimit"); } },
  {"id":"qwen38-27-q4","repo":"unsloth/Qwen3.8-27B-GGUF","revision":"4ca720788d1e01f1bff70c033e0d0028fd02e502","file":"Qwen3.8-27B-UD-Q4_K_M.gguf","bytes":16464440224,"sha256":"322e194ff79741c7baa497c240f677f54b201b0efab44ca8e50f122b39123482","label":"Qwen3.8 27B · UD Q4_K_M","parametersB":27,"minRamGiB":32,"workingGiB":21,"context":262144,"minContext":16384,"preferredContext":32768,"layers":16,"kvHeads":4,"headDim":256,"preference":90,"evidence":{"reviewed":"2026-10-22","modelCard":"https://huggingface.co/Qwen/Qwen3.8-27B","evaluation":"https://artificialanalysis.ai/models/qwen3-8-27b","community":"https://www.reddit.com/r/LocalLLaMA/comments/1vkmhyl/best_local_llms_august_2026/","status":"public-evidence"},"license":"Apache-2.0","source":"https://huggingface.co/unsloth/Qwen3.8-27B-GGUF", get capability() { return uiText("ai.curated.qwen38"); }, get limitations() { return uiText("ai.curated.qwen38Limit"); } },
  {"id":"qwen36-35-moe-q4","repo":"unsloth/Qwen3.6-35B-A3B-GGUF","revision":"a483e9e6cbd595906af30beda3187c2663a1118c","file":"Qwen3.6-35B-A3B-UD-Q4_K_M.gguf","bytes":22134528992,"sha256":"ac0e2c1189e055faa36eff361580e79c5bd6f8e76bffb4ce547f167d53e31a61","label":"Qwen3.6 35B-A3B · UD Q4_K_M","parametersB":35,"minRamGiB":48,"workingGiB":27,"context":262144,"minContext":131072,"preferredContext":131072,"layers":10,"kvHeads":2,"headDim":256,"preference":75,"evidence":{"reviewed":"2026-10-22","modelCard":"https://huggingface.co/Qwen/Qwen3.6-35B-A3B","evaluation":"https://artificialanalysis.ai/models/qwen3-6-35b-a3b/","community":"https://www.reddit.com/r/LocalLLaMA/comments/1vkmhyl/best_local_llms_august_2026/","status":"public-evidence"},"license":"Apache-2.0","source":"https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF", get capability() { return uiText("ai.curated.qwen36"); }, get limitations() { return uiText("ai.curated.qwen36Limit"); } },
];
export const ALL_MODEL_CATALOG = [...MODEL_CATALOG, ...RETIRED_MODEL_CATALOG];
export function catalogModel(id: string) {
  const model = ALL_MODEL_CATALOG.find(m => m.id === id);
  if (!model) throw new Error(uiText("server.5169f004d020"));
  return model;
}
export interface HardwareSummary { os: string; arch: string; ramGiB: number; freeRamGiB: number; diskGiB: number | null; localModelBytes?: Record<string, number>; cpu?: { name: string; logicalCores: number }; gpuChecked?: boolean; gpus: { name: string; vramGiB: number | null }[]; bundledCpu: boolean; notes: string[] }
export function modelAvailability(model: CatalogModel, h: HardwareSummary, context?: number) {
  const plan = contextPlan(model, h), size = context ?? plan.recommended;
  const reasons: string[] = [];
  if (!h.bundledCpu) reasons.push(uiText("ai.model.unsupported"));
  if (h.cpu && h.cpu.logicalCores < 4) reasons.push(uiText("ai.curated.cpuFloor"));
  if (h.ramGiB < model.minRamGiB) reasons.push(uiText("ai.model.totalRam", { size: model.minRamGiB }));
  if (estimatedModelGiB(model, size) + plan.reserveGiB > h.freeRamGiB) reasons.push(uiText("ai.model.freeRam", { size: (estimatedModelGiB(model, size) + plan.reserveGiB).toFixed(1) }));
  if (size > model.context || size < (model.minContext || 2048)) reasons.push(uiText("ai.curated.contextRange", { min: model.minContext || 2048, max: model.context }));
  const diskNeeded = Math.max(0, model.bytes - (h.localModelBytes?.[model.id] || 0)) / 2 ** 30 + 1;
  if (h.diskGiB !== null && h.diskGiB < diskNeeded) reasons.push(uiText("ai.model.disk", { size: diskNeeded.toFixed(1) }));
  return { id: model.id, available: reasons.length === 0, reasons, context: size, estimatedGiB: estimatedModelGiB(model, size) };
}
export function recommendations(h: HardwareSummary, context?: number) {
  const models = MODEL_CATALOG.map(m => modelAvailability(m, h, context));
  const eligible = MODEL_CATALOG.filter(m => models.find(x => x.id === m.id)?.available);
  const quality = [...eligible].sort((a,b) => (b.preference || 0) - (a.preference || 0))[0];
  const balanced = [...eligible].sort((a,b) => estimatedModelGiB(a, contextPlan(a,h).recommended) - estimatedModelGiB(b, contextPlan(b,h).recommended))[0];
  return { quality: quality?.id || null, balanced: balanced?.id || null, models, recommendedMode: quality ? "local" as const : "api" as const,
    qualityReason: quality ? uiText("ai.curated.preferred", { model: quality.label }) : uiText("ai.curated.apiReason"),
    balancedReason: balanced ? uiText("ai.curated.lowerResource", { model: balanced.label }) : uiText("ai.curated.noSmallFallback"),
    backend: uiText("server.488cda8f9dd5"),
    unknown: h.diskGiB === null || h.gpus.some(g => g.vramGiB === null) };
}
