import { uiText } from "../../../lib/messages.ts";
import { generationLanguage } from "@/lib/api-language";
import { withUiLanguage } from "@/lib/api-language";
import { completeWithProvider, providerError } from "@/lib/ai-provider";
import { isLocalAiRequest } from "@/lib/ai-config";
// ============================================================
// app/api/extract-ddls/route.ts — 从文档 markdown 提取 DDL 列表
// V4 Flash + 强制 tool calling 返回结构化 DDL 数组
// ============================================================

import { OpenAI } from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExtractRequest {
  markdown: string;
  filename: string;
  currentDate: string; // YYYY-MM-DD，由客户端传入，避免服务器时区问题
}

interface ExtractedDdl {
  taskName: string;
  dueDate: string;
  dueTime: string;
  weight: number | null;
  description: string;
  isGroupWork: boolean;
}

const EXTRACT_TOOL = {
  type: "function" as const,
  function: {
    name: "extract_ddls",
    description: "把文档里所有的 deadline / 作业 / 考试 / 测验 / 提交节点一次性返回成结构化数组。没有明确日期时留空，不推测开学日或学期周数。",
    parameters: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              taskName: { type: "string", description: "任务名，如 Assignment 1, Final Exam, CA1, Quiz 2" },
              dueDate: { type: "string", description: "ISO YYYY-MM-DD。若文档没明确日期，传空字符串\"\"表示待定，禁止猜测" },
              dueTime: { type: "string", description: "HH:MM 24h，未指定填 23:59" },
              weight: { type: ["number", "null"], description: "成绩占比 0-100，未提及填 null" },
              description: { type: "string", description: "简短描述，如「Submit via Blackboard」" },
              isGroupWork: { type: "boolean", description: "是否小组任务" },
            },
            required: ["taskName", "dueDate"],
          },
        },
      },
      required: ["items"],
    },
  },
};

async function handlePOST(req: Request) {
  if (!isLocalAiRequest(req, true)) return Response.json({ error: uiText("server.641c510983e7") }, { status: 403 });
  const body: ExtractRequest = await req.json();
  if (!body.markdown || body.markdown.length < 20) {
    return Response.json({ ok: false, error: uiText("server.c5a76f41ea06") }, { status: 400 });
  }


  const systemPrompt =
    `你是 DDL 提取专家。严格从课程文档中识别所有 deadline / 作业 / 考试 / 测验，并调用 extract_ddls 工具一次性返回。\n` +
    `今天是 ${body.currentDate}。\n\n` +
    `**核心原则：宁可漏标也不要瞎猜。文档没明确给出的信息一律按"未知"处理。**\n\n` +
    `日期规则：\n` +
    `① 文档明确给出绝对日期（如 "May 27"）→ 转为 ISO YYYY-MM-DD。\n` +
    `② 文档给出 "Week N" 且明确学期开学日 → 按 (N-1)*7 天推算。\n` +
    `③ 文档没有明确日期也没有 Week N → dueDate 设为空字符串 ""，表示「待定」。**禁止用学期末或任意日期兜底。**\n\n` +
    `权重规则：\n` +
    `① 文档明确写出某项的百分比（如 "CA1 10%"）→ weight 填该数字。\n` +
    `② 只给出总分构成（如 "Total = CA1 + CA2 + SDCL + FA = 100%"）但没分项 → 单项 weight 仍按文档明确部分填，不要均分推算。\n` +
    `③ 完全没提及权重 → weight 设为 null。\n\n` +
    `其他规则：\n` +
    `① 明确说"不计入成绩"的活动（如 action research quiz）跳过。\n` +
    `② description 字段写入文档中对该项的具体描述（章节/lesson 编号/提交方式等），便于用户后续核对。\n` +
    `③ 一次性返回所有项，不要分多次调用。`;

  try {
    const completion = await completeWithProvider({
      messages: [
        { role: "system", content: (systemPrompt) + "\n\n" + generationLanguage(req) },
        { role: "user", content: `文档名：${body.filename}\n\n文档内容：\n${body.markdown}` },
      ],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "function", function: { name: "extract_ddls" } },
      max_tokens: 2000,
      temperature: 0.2,
    });

    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return Response.json({ ok: false, error: uiText("server.fa949aa39a54"), raw: completion.choices[0]?.message?.content }, { status: 500 });
    }

    const parsed = JSON.parse(toolCall.function.arguments) as { items: ExtractedDdl[] };
    return Response.json({
      ok: true,
      items: parsed.items || [],
      usage: completion.usage,
    });
  } catch (err) {
    return Response.json({ ok: false, error: providerError(err) }, { status: 500 });
  }
}

export const POST = withUiLanguage(handlePOST);
