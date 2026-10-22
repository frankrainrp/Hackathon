import { uiText } from "../../../lib/messages.ts";
import { withUiLanguage } from "@/lib/api-language";
import { z } from "zod";
import { readState, writeState } from "@/lib/server-db";
import { isLocalAiRequest } from "@/lib/ai-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEYS = ["ddls", "sessions", "messages", "notes"] as const;
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const payloadSchema = z.object({
  key: z.enum(KEYS),
  value: z.array(z.unknown()).max(50_000),
});

async function handleGET(req: Request) {
  if (!isLocalAiRequest(req)) return Response.json({ error: uiText("server.641c510983e7") }, { status: 403 });
  return Response.json(Object.fromEntries(KEYS.map((key) => [key, readState(key)])), {
    headers: { "cache-control": "no-store" },
  });
}

async function handlePUT(req: Request) {
  if (!isLocalAiRequest(req, true)) return Response.json({ error: uiText("server.641c510983e7") }, { status: 403 });
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: uiText("server.6f5abbce3e03") }, { status: 413 });
  }

  let raw: unknown;
  try {
    const text = await req.text();
    if (Buffer.byteLength(text, "utf8") > MAX_REQUEST_BYTES) {
      return Response.json({ error: uiText("server.6f5abbce3e03") }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return Response.json({ error: uiText("server.f92e4d96a46a") }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: uiText("server.1d973dc85c74") }, { status: 400 });
  }

  writeState(parsed.data.key, parsed.data.value);
  return Response.json({ ok: true });
}

export const GET = withUiLanguage(handleGET);
export const PUT = withUiLanguage(handlePUT);
