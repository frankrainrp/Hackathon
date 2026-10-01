import { readLmsFeed } from "@/lib/server-db";
import { isLocalLmsRequest } from "@/lib/lms-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isLocalLmsRequest(req)) return Response.json({ error: "School data is available only on this computer." }, { status: 403 });
  return Response.json(readLmsFeed(), { headers: { "cache-control": "no-store" } });
}
