import type { CatalogModel, HardwareSummary } from "./ai-catalog.ts";

const GIB = 2 ** 30;
// Single sequence, F16 K and V caches; engine-host pins these runtime options.
export function estimatedModelGiB(model: CatalogModel, context: number) {
  const cacheBytes = (n: number) => (model.cacheGroups || [{ layers: model.layers, kvHeads: model.kvHeads, headDim: model.headDim }]).reduce((sum, group) => sum + 2 * 2 * group.layers * group.kvHeads * group.headDim * Math.min(n, group.window || n), 0);
  // workingGiB includes weights and a conservative compute allowance at 4K.
  return model.workingGiB + (cacheBytes(context) - cacheBytes(4096)) / GIB;
}
export function contextPlan(model: CatalogModel, memory?: Pick<HardwareSummary, "ramGiB" | "freeRamGiB"> | null) {
  const reserveGiB = memory ? Math.max(1, memory.ramGiB * 0.08) : 1;
  const options = [2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144].filter(n => n >= (model.minContext || 2048) && n <= model.context);
  const fits = (n: number) => !memory || estimatedModelGiB(model, n) + reserveGiB <= memory.freeRamGiB;
  const available = options.filter(fits);
  // Do not shrink below a model's task floor merely to manufacture hardware eligibility.
  const target = model.preferredContext || 4096;
  const recommended = memory ? available.filter(n => n <= target).at(-1) ?? options[0] : target;
  return { options, recommended, max: model.context, reserveGiB, fits: !!available.length,
    available, estimatedGiB: estimatedModelGiB(model, recommended) };
}
