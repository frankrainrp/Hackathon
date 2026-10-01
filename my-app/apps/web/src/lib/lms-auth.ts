import { timingSafeEqual } from "node:crypto";

/** This repository is a single-user app. New school-data routes are local-only. */
export function isLocalLmsRequest(request: Request) {
  const host = new URL(request.url).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) return false;
  const origin = request.headers.get("origin");
  try {
    if (origin && new URL(origin).origin !== new URL(request.url).origin) return false;
  } catch { return false; }
  return request.headers.get("sec-fetch-site") !== "cross-site";
}

export function hasLmsToken(request: Request) {
  const expected = process.env.LMS_SYNC_TOKEN || "";
  const actual = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (expected.length < 32 || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
