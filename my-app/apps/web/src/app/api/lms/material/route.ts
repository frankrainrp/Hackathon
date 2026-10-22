import { createReadStream, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { configPath } from "@/lib/lms-profile-store";
import { readLmsFeed } from "@/lib/server-db";
import { isLocalLmsRequest } from "@/lib/lms-auth";
import { materialByteRange, registeredMaterialFile, type MaterialSelector } from "@/lib/lms-material-file";
import { uiText } from "@/lib/messages";
import { withUiLanguage } from "@/lib/api-language";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleGET(req: Request) {
  if (!isLocalLmsRequest(req)) return Response.json({ error: uiText("reader.localOnly") }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const selector = Object.fromEntries(["profile", "semester", "course", "material"].map(key => [key, params.get(key) || ""])) as MaterialSelector;
  if (Object.values(selector).some(value => !/^[a-zA-Z0-9_-]{1,100}$/.test(value))) return Response.json({ error: uiText("reader.fileUnavailable") }, { status: 404 });
  let root: string;
  try {
    const config = JSON.parse(readFileSync(configPath(), "utf8").replace(/^\uFEFF/, ""));
    root = resolve(dirname(configPath()), config.output_dir || "courses");
  } catch { return Response.json({ error: uiText("reader.fileUnavailable") }, { status: 404 }); }
  const file = registeredMaterialFile(root, readLmsFeed().courses || [], selector);
  if (!file) return Response.json({ error: uiText("reader.fileUnavailable") }, { status: 404 });
  const range = materialByteRange(req.headers.get("range"), file.size);
  if (!range) return new Response(null, { status: 416, headers: { "content-range": `bytes */${file.size}` } });
  const headers = new Headers({
    "content-type": file.pdf ? "application/pdf" : "application/octet-stream",
    "content-disposition": `${file.pdf && params.get("download") !== "1" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name).replaceAll("'", "%27")}`,
    "content-length": String(Math.max(0, range.end - range.start + 1)),
    "accept-ranges": "bytes", "cache-control": "private, no-store", "x-content-type-options": "nosniff",
    "content-security-policy": "frame-ancestors 'self'", "x-frame-options": "SAMEORIGIN", "referrer-policy": "no-referrer",
  });
  if (range.partial) headers.set("content-range", `bytes ${range.start}-${range.end}/${file.size}`);
  const body = req.method === "HEAD" || !file.size ? null : Readable.toWeb(createReadStream(file.path, { start: range.start, end: range.end })) as ReadableStream<Uint8Array>;
  return new Response(body, { status: range.partial ? 206 : 200, headers });
}

export const GET = withUiLanguage(handleGET);
export const HEAD = GET;
