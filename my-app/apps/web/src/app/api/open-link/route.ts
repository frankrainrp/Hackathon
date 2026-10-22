import { isLocalAiRequest } from "@/lib/ai-config";
import { openInEdge } from "@/lib/browser-links";
import { withUiLanguage } from "@/lib/api-language";
import { uiText } from "@/lib/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = withUiLanguage(async (request: Request) => {
  if (!isLocalAiRequest(request, true)) return Response.json({ error: uiText("links.denied") }, { status: 403 });
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 4000) return Response.json({ error: uiText("links.invalid") }, { status: 413 });
    await openInEdge(JSON.parse(text).url);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : uiText("links.failed") }, { status: 400 });
  }
});
