// Reviewed metadata, pinned to official publisher revisions. Weights are never bundled/downloaded automatically.
export const CATALOG_VERSION = "2026-10-21.1";
export interface CatalogModel {
  id: string; repo: string; revision: string; file: string; bytes: number; sha256: string;
  label: string; minRamGiB: number; workingGiB: number; context: number; license: string;
  capability: string; limitations: string; source: string;
}
export const MODEL_CATALOG: CatalogModel[] = [
  { id: "qwen3-06-q8", repo: "Qwen/Qwen3-0.6B-GGUF", revision: "23749fefcc72300e3a2ad315e1317431b06b590a", file: "Qwen3-0.6B-Q8_0.gguf", bytes: 639446688, sha256: "9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031", label: "Qwen3 0.6B · Q8", minRamGiB: 4, workingGiB: 2.5, context: 4096, license: "Apache-2.0", capability: "Short text chat and setup checks on smaller computers.", limitations: "Limited reasoning and unreliable tool use. Review every extracted date and proposed action.", source: "https://huggingface.co/Qwen/Qwen3-0.6B-GGUF" },
  { id: "qwen3-4-q4", repo: "Qwen/Qwen3-4B-GGUF", revision: "bc640142c66e1fdd12af0bd68f40445458f3869b", file: "Qwen3-4B-Q4_K_M.gguf", bytes: 2497280256, sha256: "7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5", label: "Qwen3 4B · Q4_K_M", minRamGiB: 8, workingGiB: 5, context: 4096, license: "Apache-2.0", capability: "Multilingual study explanations, short summaries and structured extraction; publisher documents tool calling.", limitations: "Quantized text model. Tool/JSON reliability depends on the task; review results. CPU inference can be slow.", source: "https://huggingface.co/Qwen/Qwen3-4B-GGUF" },
  { id: "qwen3-8-q4", repo: "Qwen/Qwen3-8B-GGUF", revision: "7c41481f57cb95916b40956ab2f0b139b296d974", file: "Qwen3-8B-Q4_K_M.gguf", bytes: 5027783488, sha256: "d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785", label: "Qwen3 8B · Q4_K_M", minRamGiB: 12, workingGiB: 8, context: 4096, license: "Apache-2.0", capability: "More headroom for multi-step explanations and extraction in this reviewed Qwen3 text-model set; publisher evaluations cover reasoning and multilingual tasks.", limitations: "Quality-first within this small catalog, not a claim of best available model. CPU latency may be high. Not OCR or web search.", source: "https://huggingface.co/Qwen/Qwen3-8B-GGUF" },
];
export function catalogModel(id: string) {
  const model = MODEL_CATALOG.find(m => m.id === id);
  if (!model) throw new Error("Choose a model from the reviewed catalog.");
  return model;
}
export interface HardwareSummary { os: string; arch: string; ramGiB: number; freeRamGiB: number; diskGiB: number | null; gpus: { name: string; vramGiB: number | null }[]; bundledCpu: boolean; notes: string[] }
export function recommendations(h: HardwareSummary, context = 4096) {
  const eligible = MODEL_CATALOG.filter(m => h.bundledCpu && h.ramGiB >= m.minRamGiB && h.freeRamGiB >= m.workingGiB + Math.max(0, (context - 4096) / 1024) && (h.diskGiB === null || h.diskGiB >= m.bytes / 2 ** 30 + 1));
  const quality = eligible.at(-1);
  const balanced = eligible.find(m => m.id === "qwen3-4-q4") || eligible[0];
  return { quality: quality?.id || null, balanced: balanced?.id || null,
    qualityReason: quality ? `${quality.capability} Estimated working memory at ${context} tokens fits currently available RAM with headroom. This is a conservative estimate, not a benchmark of this computer.` : "No reviewed model fits the current free RAM/disk estimate. Close other apps, choose a larger local drive, or use DeepSeek. Hardware details may be incomplete.",
    balancedReason: balanced ? `${balanced.label} reduces memory and CPU work while retaining ${balanced.id.includes("06") ? "basic chat" : "study text and extraction capability"}. Check the sample before trusting structured results.` : "No safe balanced suggestion at the current memory/context setting.",
    backend: "Bundled Windows x64 CPU engine. Detected GPUs are informational; this package does not ship a GPU backend. CPU fallback needs no driver installation.",
    unknown: h.diskGiB === null || h.gpus.some(g => g.vramGiB === null) };
}
