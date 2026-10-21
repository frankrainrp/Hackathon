
import { uiText } from "./messages.ts";
// ============================================================
// lib/research-assembler.ts — 多小队发现 → 面板 spec（P3，确定性，无 AI）
//
// 把 plan + 各 squad 的结构化发现，用代码拼成 GeneratedPanelSpec：
//   - 顶部 intro markdown（目标 + 小队清单）
//   - 每个 squad：static 数据源 + table（+ 可选 chart）+ summary markdown
// 不再调 AI → 省一次调用、零 JSON 校验风险。
// ============================================================

import type {
  GeneratedPanelSpec,
  DataSource,
  Block,
  TableColumn,
  BlockType,
  ValueFormat,
} from "./panel-schema";

export interface ResearchPlan {
  title: string;
  emoji: string;
  squads: { title: string; question: string }[];
}

export interface SquadFinding {
  summary: string;
  rows?: Record<string, unknown>[];
  columns?: TableColumn[];
  chart?: { type?: string; x?: string; y?: string };
}

const CHART_TYPES: BlockType[] = ["bar", "line", "pie"];

function inferColumns(rows: Record<string, unknown>[]): TableColumn[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]).slice(0, 6).map((k) => {
    const v = rows[0][k];
    const fmt: ValueFormat | undefined = typeof v === "number" ? "number" : undefined;
    return { key: k, label: k, ...(fmt ? { format: fmt } : {}) };
  });
}

export function assembleSpec(
  plan: ResearchPlan,
  findings: (SquadFinding | null)[],
): GeneratedPanelSpec {
  const sources: DataSource[] = [];
  const blocks: Block[] = [];

  // 顶部 intro
  const squadList = plan.squads.map((s, i) => `${i + 1}. **${s.title}** — ${s.question}`).join("\n");
  blocks.push({
    id: "intro",
    type: "markdown",
    title: uiText("ui.researchassembler.7317d51c69"),
    markdown: uiText("ui.researchassembler.18a87dfa5f", { value0: plan.squads.length, value1: squadList }),
  });

  plan.squads.forEach((squad, i) => {
    const f = findings[i];
    if (!f) {
      blocks.push({
        id: `sq-${i}-fail`,
        type: "markdown",
        title: squad.title,
        markdown: uiText("ui.researchassembler.e9dfdf2e30"),
      });
      return;
    }

    const rows = Array.isArray(f.rows) ? f.rows.filter((r) => r && typeof r === "object") : [];
    const hasData = rows.length > 0;

    if (hasData) {
      const srcId = `sq${i}`;
      sources.push({ id: srcId, kind: "static", data: rows });

      // 可选图表（chart 指定且字段存在）
      const chart = f.chart;
      const chartType = chart?.type && CHART_TYPES.includes(chart.type as BlockType) ? (chart.type as BlockType) : null;
      const validChart = chartType && chart?.x && chart?.y && chart.x in rows[0] && chart.y in rows[0];
      if (validChart) {
        blocks.push({
          id: `sq-${i}-chart`,
          type: chartType,
          title: uiText("ui.researchassembler.8775af9743", { value0: squad.title }),
          sourceId: srcId,
          x: chart!.x,
          y: chart!.y,
          limit: 12,
          span: 2,
        });
      }

      const columns = (f.columns && f.columns.length > 0 ? f.columns : inferColumns(rows));
      blocks.push({
        id: `sq-${i}-table`,
        type: "table",
        title: uiText("ui.researchassembler.f054a47887", { value0: squad.title }),
        sourceId: srcId,
        columns,
        limit: 12,
      });
    }

    // summary markdown
    if (f.summary && f.summary.trim()) {
      blocks.push({
        id: `sq-${i}-sum`,
        type: "markdown",
        title: hasData ? uiText("ui.researchassembler.a7daa2cd05", { value0: squad.title }) : squad.title,
        markdown: f.summary,
        span: hasData ? 1 : 2,
      });
    }
  });

  return {
    version: 1,
    title: plan.title,
    emoji: plan.emoji,
    description: uiText("ui.researchassembler.dc298b768f"),
    sources,
    blocks,
  };
}
