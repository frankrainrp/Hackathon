// ============================================================
// lib/panel-schema.ts — 「面板应用」声明式 schema（P1 引擎地基）
//
// 一个 GeneratedPanelSpec 就是一个面板的「源代码」：
//   sources[]  数据源（static 内联 / http 经 /api/connector 代理拉真实 API）
//   blocks[]   组件块（stat/kpiGrid/table/bar/line/pie/list/markdown），按序竖排
//
// AI（P2）只需产出这份 JSON；渲染器（GeneratedPanelView）取数 + 渲染。
// 无任意代码执行 → 安全可控（用户选的「声明式组件块」运行时）。
// ============================================================

export type BlockType = "stat" | "kpiGrid" | "table" | "bar" | "line" | "pie" | "list" | "markdown";
export type Agg = "count" | "sum" | "avg" | "max" | "min";
export type ValueFormat = "number" | "currency" | "percent" | "text";

export interface DataSource {
  id: string;
  kind: "static" | "http";
  // --- static ---
  /** kind=static：内联数据（数组或对象）*/
  data?: unknown;
  // --- http（经 /api/connector 服务端代理，绕 CORS / 注入密钥）---
  url?: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  query?: Record<string, string | number>;
  body?: unknown;
  /** 点路径，取响应里真正要用的数组/对象，如 "data.items"；空=整个响应 */
  path?: string;
  /** 把「键值对象」透视成行数组（如汇率 {EUR:0.9,...} → [{currency:"EUR",rate:0.9}]）*/
  pivot?: { keyName?: string; valueName?: string };
  /** 自动刷新间隔（ms）；省略=不自动刷新 */
  refreshMs?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  format?: ValueFormat;
}

export interface Metric {
  label: string;
  /** 指定则对 sourceId 的数组聚合；否则用 value 字面量 */
  sourceId?: string;
  agg?: Agg;
  field?: string;
  value?: number;
  format?: ValueFormat;
}

export interface Block {
  id: string;
  type: BlockType;
  title?: string;
  /** 数据块绑定的数据源 id */
  sourceId?: string;
  /** 整宽(2) / 半宽(1)，默认整宽 */
  span?: 1 | 2;

  // table
  columns?: TableColumn[];

  // bar / line / pie
  x?: string; // 标签字段
  y?: string; // 数值字段
  limit?: number;

  // list
  primary?: string;
  secondary?: string;

  // stat（单大数字，用下列字段）
  agg?: Agg;
  field?: string;
  value?: number;
  format?: ValueFormat;

  // kpiGrid（多指标小卡）
  metrics?: Metric[];

  // markdown
  markdown?: string;
}

export interface GeneratedPanelSpec {
  version: 1;
  title: string;
  emoji?: string;
  description?: string;
  sources: DataSource[];
  blocks: Block[];
}

// ============================================================
// 解析 / 校验
// ============================================================
export type ParseResult =
  | { ok: true; spec: GeneratedPanelSpec }
  | { ok: false; error: string };

export function parseSpec(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: "JSON 解析失败：" + (e as Error).message };
  }
  return validateSpec(raw);
}

export function validateSpec(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "spec 必须是对象" };
  const o = raw as Record<string, unknown>;
  if (typeof o.title !== "string" || !o.title.trim()) return { ok: false, error: "缺少 title" };
  if (!Array.isArray(o.sources)) return { ok: false, error: "sources 必须是数组" };
  if (!Array.isArray(o.blocks)) return { ok: false, error: "blocks 必须是数组" };
  // id 是实现细节：缺失则自动补（AI/手写都不必写 id）
  (o.sources as DataSource[]).forEach((s, i) => {
    if (!s || typeof s !== "object") return;
    if (typeof s.id !== "string" || !s.id) s.id = `src-${i}`;
    if (s.kind !== "static" && s.kind !== "http") s.kind = s.url ? "http" : "static";
  });
  for (const s of o.sources as DataSource[]) {
    if (s.kind === "http" && typeof s.url !== "string") return { ok: false, error: `http 数据源 ${s.id} 缺少 url` };
  }
  (o.blocks as Block[]).forEach((b, i) => {
    if (!b || typeof b !== "object") return;
    if (typeof b.id !== "string" || !b.id) b.id = `block-${i}`;
  });
  for (const b of o.blocks as Block[]) {
    if (!b.type) return { ok: false, error: `block ${b.id} 缺少 type` };
  }
  return { ok: true, spec: { version: 1, ...(o as object) } as GeneratedPanelSpec };
}

// ============================================================
// 数据处理 helpers
// ============================================================

/** 点路径取值：getByPath({a:{b:[1]}}, "a.b.0") → 1 */
export function getByPath(obj: unknown, path?: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) return acc[Number(key)];
    if (typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** 任意值规整成数组（对象→[对象]，null/undefined→[]）*/
export function asArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === "object") return [v as Record<string, unknown>];
  return [];
}

export function aggregate(rows: Record<string, unknown>[], agg: Agg = "count", field?: string): number {
  if (agg === "count") return rows.length;
  if (!field) return 0;
  const nums = rows.map((r) => Number(r[field])).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return 0;
  if (agg === "sum") return nums.reduce((a, b) => a + b, 0);
  if (agg === "avg") return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (agg === "max") return Math.max(...nums);
  if (agg === "min") return Math.min(...nums);
  return 0;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export function toSeries(rows: Record<string, unknown>[], x?: string, y?: string, limit?: number): SeriesPoint[] {
  const capped = typeof limit === "number" ? rows.slice(0, limit) : rows;
  return capped.map((r, i) => ({
    label: x ? String(r[x] ?? "") : `#${i + 1}`,
    value: y ? Number(r[y]) || 0 : 0,
  }));
}

export function formatValue(v: unknown, fmt: ValueFormat = "text"): string {
  if (v == null || v === "") return "—";
  if (fmt === "text") return String(v);
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (fmt === "percent") return `${n >= 0 ? "" : ""}${n.toFixed(2)}%`;
  const grouped = Math.abs(n) >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  if (fmt === "currency") return `$${grouped}`;
  return grouped;
}

// ============================================================
// 示例 spec — Crypto Top 10（CoinGecko 公共 API，无需 key）
// 切到「应用」类型且无 spec 时种入，立证「真实 API → 实时面板」
// ============================================================
export const SAMPLE_SPEC: GeneratedPanelSpec = {
  version: 1,
  title: "Crypto Top 10 · 实时行情",
  emoji: "📈",
  description: "CoinGecko 公共 API（无需密钥）经后端连接器代理拉取，演示「数据源 + 组件块」引擎。",
  sources: [
    {
      id: "coins",
      kind: "http",
      url: "https://api.coingecko.com/api/v3/coins/markets",
      method: "GET",
      query: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 10,
        page: 1,
        price_change_percentage: "24h",
      },
      refreshMs: 60000,
    },
  ],
  blocks: [
    {
      id: "kpis",
      type: "kpiGrid",
      title: "市值概览",
      metrics: [
        { label: "币种数", sourceId: "coins", agg: "count" },
        { label: "总市值", sourceId: "coins", agg: "sum", field: "market_cap", format: "currency" },
        { label: "最高价", sourceId: "coins", agg: "max", field: "current_price", format: "currency" },
      ],
    },
    {
      id: "bar-price",
      type: "bar",
      title: "现价（USD）",
      sourceId: "coins",
      x: "symbol",
      y: "current_price",
      limit: 10,
      span: 2,
    },
    {
      id: "table",
      type: "table",
      title: "榜单明细",
      sourceId: "coins",
      columns: [
        { key: "market_cap_rank", label: "#" },
        { key: "name", label: "名称" },
        { key: "symbol", label: "符号" },
        { key: "current_price", label: "现价", format: "currency" },
        { key: "price_change_percentage_24h", label: "24h%", format: "percent" },
        { key: "market_cap", label: "市值", format: "currency" },
      ],
    },
  ],
};
