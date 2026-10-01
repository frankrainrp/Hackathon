import { isLocalLmsRequest } from "@/lib/lms-auth";
import { readLmsFeed } from "@/lib/server-db";
import { selectCourseContext } from "@/lib/course-context";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (!isLocalLmsRequest(req)) return Response.json({ error: "Local access only" }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const context = selectCourseContext(readLmsFeed(), (params.get("q") || "").slice(0, 2000), params.get("course")?.slice(0, 200));
  return Response.json({ courses: context.courses, readablePassages: context.sources.length, missingText: context.missingText,
    sources: context.sources.map(s => ({ label: s.label, url: s.url, truncated: s.truncated })) }, { headers: { "cache-control": "no-store" } });
}
