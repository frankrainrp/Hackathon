import { uiText } from "../../../../lib/messages.ts";
import { withUiLanguage } from "@/lib/api-language";
import { isLocalLmsRequest } from "@/lib/lms-auth";
import { readLmsFeed } from "@/lib/server-db";
import { selectCourseContext } from "@/lib/course-context";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handleGET(req: Request) {
  if (!isLocalLmsRequest(req)) return Response.json({ error: uiText("server.0163e7aa4646") }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const context = selectCourseContext(readLmsFeed(), (params.get("q") || "").slice(0, 2000), params.get("course")?.slice(0, 200));
  return Response.json({ courses: context.courses, readablePassages: context.sources.length, missingText: context.missingText,
    sources: context.sources.map(s => ({ label: s.label, url: s.url, truncated: s.truncated })) }, { headers: { "cache-control": "no-store" } });
}

export const GET = withUiLanguage(handleGET);
