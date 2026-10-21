import { uiText } from "../../../../lib/messages.ts";
import { withUiLanguage } from "@/lib/api-language";
import { readLmsFeed } from "@/lib/server-db";
import { isLocalLmsRequest } from "@/lib/lms-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleGET(req: Request) {
  if (!isLocalLmsRequest(req)) return Response.json({ error: uiText("server.10103c2d8428") }, { status: 403 });
  return Response.json(readLmsFeed(), { headers: { "cache-control": "no-store" } });
}

export const GET = withUiLanguage(handleGET);
