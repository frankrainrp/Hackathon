import { uiText } from "../../../lib/messages.ts";
import { generationLanguage } from "@/lib/api-language";
import { withUiLanguage } from "@/lib/api-language";
import { completeWithProvider, providerError } from "@/lib/ai-provider";
import { isLocalAiRequest } from "@/lib/ai-config";
// ============================================================
// app/api/generate-source/route.ts — 动态配数据源（按需，非写死模板）
//
// 用户一句描述 → AI 临时推断**单个** DataSource（url/query/path/headers）
// + 几个建议块。任意 API 都行，不依赖固定服务清单。
// 密钥用 "env:KEY" 占位（连接器服务端注入），不进前端。
// ============================================================

import { OpenAI } from "openai";
import { validateSpec, type DataSource, type Block } from "@/lib/panel-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `你是数据源配置器。把用户对「想要的数据」的描述，转成**一个**数据源 + 建议展示块的 JSON。只输出 JSON，不要解释。

结构：{
  "source": {
    "id": "ds",
    "kind": "http",                       // 或 "static"
    "url": "https://...",                 // http 时必填，要准确
    "method": "GET",
    "query": { ... },                     // 可选查询参数
    "headers": { ... },                   // 可选；需鉴权时用 "env:KEY_NAME" 占位，如 {"Authorization":"Bearer env:API_TOKEN"}
    "path": "data.items",                 // 响应里指向数组的点路径(响应本身是数组则省略)
    "pivot": {"keyName":"k","valueName":"v"},  // 可选：响应是「键值对象」时透视成行(如汇率)
    "refreshMs": 60000,                   // 可选
    "data": [ ... ]                       // 仅 kind=static 时：内联样本数据
  },
  "blocks": [ {展示块...} ]               // 1-3 个：table/bar/line/pie/kpiGrid/list，sourceId 用 "ds"
}

块字段：
- table: {"id","type":"table","sourceId":"ds","columns":[{"key","label","format":"currency|percent|number|text"}],"limit":10}
- bar|line|pie: {"id","type":"bar","sourceId":"ds","x":"标签字段","y":"数值字段","limit":10,"span":2}
- kpiGrid: {"id","type":"kpiGrid","metrics":[{"label","sourceId":"ds","agg":"count|sum|avg|max|min","field","format"}]}

规则：
1. 你确信存在的「公开、无需密钥」API 用 kind:http，url/query 准确（如 CoinGecko、Frankfurter 汇率、GitHub、Hacker News 等）。
2. 需要密钥的 API：仍用 kind:http，鉴权处写 "env:KEY_NAME" 占位，并据常识取合理的 KEY 名。
3. 完全不确定有无可用 API → kind:static，data:[]；在展示块中解释缺少可核实的数据源。不要伪造真实感数据。
4. 字段名(英文)在 source 数据、columns.key、x/y 之间保持一致。
5. id 用短英文；只输出 JSON 对象本身。`;

async function handlePOST(req: Request) {
  if (!isLocalAiRequest(req, true)) return Response.json({ error: uiText("server.641c510983e7") }, { status: 403 });
  let prompt = "";
  try { prompt = ((await req.json())?.prompt ?? "").trim(); } catch { /* */ }
  if (!prompt) return Response.json({ ok: false, error: uiText("server.3dde9bf15e34") }, { status: 400 });

  try {
    const c = await completeWithProvider({
      messages: [{ role: "system", content: (SYSTEM) + "\n\n" + generationLanguage(req) }, { role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1600,
      temperature: 0.4,
    });
    const raw = c.choices[0]?.message?.content ?? "";
    let parsed: { source?: DataSource; blocks?: Block[] };
    try { parsed = JSON.parse(raw); } catch { return Response.json({ ok: false, error: uiText("server.8c24c1b40c07"), raw }, { status: 200 }); }
    const source = parsed.source;
    if (!source || typeof source !== "object") return Response.json({ ok: false, error: uiText("server.3d9a80ad87f1"), raw }, { status: 200 });
    if (!source.id) source.id = "ds";
    if (source.kind !== "static" && source.kind !== "http") source.kind = source.url ? "http" : "static";
    if (source.kind === "http" && !source.url) return Response.json({ ok: false, error: uiText("server.c3434418c4de"), raw }, { status: 200 });
    const blocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
    // 借 validateSpec 自动补块 id / 基本校验（包成临时 spec）
    const v = validateSpec({ version: 1, title: "tmp", sources: [source], blocks });
    if (v.ok !== true) return Response.json({ ok: false, error: uiText("server.73393e0ff203") + v.error, raw }, { status: 200 });
    return Response.json({ ok: true, source: v.spec.sources[0], blocks: v.spec.blocks, usage: c.usage });
  } catch (err) {
    return Response.json({ ok: false, error: providerError(err) }, { status: 200 });
  }
}

export const POST = withUiLanguage(handlePOST);
