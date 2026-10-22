import { timingSafeEqual, randomBytes } from "node:crypto";

const internal = globalThis as typeof globalThis & { butlerWorkerToken?: string };
/** Private per-process credential, supplied only to a server-owned school worker. */
export const workerLmsToken = () => internal.butlerWorkerToken ||= randomBytes(32).toString("hex");

/** This repository is a single-user app. New school-data routes are local-only. */
export function isLocalLmsRequest(request: Request) {
  // localhost, 127.0.0.1 and ::1 are all this computer; treat them as equivalent
  // (Next.js reports "localhost" unless started with -H, while the browser may use 127.0.0.1).
  const LOCAL = ["localhost", "127.0.0.1", "[::1]"];
  const url = new URL(request.url);
  if (!LOCAL.includes(url.hostname)) return false;
  const origin = request.headers.get("origin");
  try {
    if (origin) {
      const o = new URL(origin);
      if (!LOCAL.includes(o.hostname) || o.protocol !== url.protocol || o.port !== url.port) return false;
    }
  } catch { return false; }
  return request.headers.get("sec-fetch-site") !== "cross-site";
}

export function hasLmsToken(request: Request) {
  const actual = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  return [process.env.LMS_SYNC_TOKEN, internal.butlerWorkerToken].some(expected => {
    if (!expected || expected.length < 32) return false;
    const a = Buffer.from(actual), b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
