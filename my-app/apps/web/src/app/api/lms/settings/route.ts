import { uiText } from "../../../../lib/messages.ts";
import { withUiLanguage } from "@/lib/api-language";
import { isLocalLmsRequest } from "@/lib/lms-auth";
import { activeProfile, previewProfile } from "@/lib/lms-profile";
import { readProfiles, readCatalog, requirePublicHost, saveProfile } from "@/lib/lms-profile-store";
import { applyProfileMetadata } from "@/lib/lms-sync";
import { readLmsFeed, readState, updateLmsFeed } from "@/lib/server-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handleGET(req: Request) {
  if (!isLocalLmsRequest(req)) return Response.json({ error: uiText("server.641c510983e7") }, { status: 403 });
  const settings = readProfiles();
  if (new URL(req.url).searchParams.get("export") === "1") return Response.json({ version: 1, exportedAt: new Date().toISOString(), settings, feed: readLmsFeed(), state: { ddls: readState("ddls"), notes: readState("notes") } }, { headers: { "content-disposition": 'attachment; filename="butler-learning-backup.json"', "cache-control": "no-store" } });
  const profile = activeProfile(settings);
  return Response.json({ settings, catalog: profile ? readCatalog(profile.id) : [], activation: "not-managed" }, { headers: { "cache-control": "no-store" } });
}
async function handlePOST(req: Request) {
  if (!isLocalLmsRequest(req) || !req.headers.get("origin")) return Response.json({ error: uiText("server.697c7464778a") }, { status: 403 });
  try {
    const text = await req.text();
    if (Buffer.byteLength(text) > 100_000) return Response.json({ error: uiText("server.a965b1014d22") }, { status: 413 });
    const body = JSON.parse(text);
    const preview = previewProfile(body.profile);
    await requirePublicHost(preview.domain);
    if (body.confirm !== true) return Response.json({ preview });
    const settings = saveProfile(body.profile);
    updateLmsFeed(feed => applyProfileMetadata(feed, settings));
    return Response.json({ settings, catalog: readCatalog(preview.id), activation: "not-managed" });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : uiText("server.bb021fe041b7") }, { status: 400 }); }
}

export const GET = withUiLanguage(handleGET);
export const POST = withUiLanguage(handlePOST);
