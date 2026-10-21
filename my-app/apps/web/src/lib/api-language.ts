import { localizeExternal, requestLanguage } from "./messages.ts";

/** Translate only application status/error fields. User and course content is untouched. */
export function withUiLanguage(handler: (...args: any[]) => Promise<Response> | Response) {
  return async (request: Request, ...args: any[]): Promise<Response> => {
    const response = await handler(request, ...args);
    if (!(response.headers.get("content-type") || "").includes("application/json")) return response;
    let body: Record<string, any>;
    try { body = await response.clone().json(); } catch { return response; }
    if (!body || typeof body !== "object" || Array.isArray(body)) return response;
    const lang = requestLanguage(request);
    let changed = false;
    for (const field of ["error", "message"]) {
      if (typeof body[field] !== "string") continue;
      const translated = localizeExternal(body[field], lang);
      if (translated !== body[field]) { body[field] = translated; changed = true; }
    }
    if (!changed) return response;
    const headers = new Headers(response.headers); headers.delete("content-length");
    return new Response(JSON.stringify(body), { status: response.status, statusText: response.statusText, headers });
  };
}

export function generationLanguage(request: Request): string {
  const language = requestLanguage(request) === "zh" ? "Simplified Chinese" : "English";
  return `Interface language: ${language}. Write all user-visible titles, descriptions, summaries, labels and explanations in ${language}, unless the user explicitly asks otherwise. Preserve names, quoted source content, URLs, IDs and machine schema keys. Never invent personal details, assignment submission status, measurements, prices or live data. When verified data is unavailable, use an empty data set and explain the missing source. Do not populate example or test values as real data.`;
}
