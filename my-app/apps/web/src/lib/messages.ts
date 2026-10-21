import en from "./locales/en.ts";
import zh from "./locales/zh.ts";

export type Lang = "en" | "zh";
export type MessageParams = Record<string, unknown>;
export type TFunc = (key: string, params?: MessageParams) => string;
export const LANG_KEY = "butler.lang";
export const LANG_EVENT = "butler:lang-change";
export const DEFAULT_LANGUAGE: Lang = "en";
const dictionaries: Record<Lang, Record<string, string>> = { en, zh };
// The server and the first hydration render are always English. Saved choices
// are applied after mount, avoiding different server/client initial markup.
let currentLanguage: Lang = DEFAULT_LANGUAGE;
export const getUiLanguage = (): Lang => currentLanguage;
export const languageTag = (lang: Lang = currentLanguage) => lang === "zh" ? "zh-CN" : "en-GB";
export function getStoredLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try { return window.localStorage.getItem(LANG_KEY) === "zh" ? "zh" : "en"; }
  catch { return DEFAULT_LANGUAGE; }
}
function applyLanguage(lang: Lang) {
  const changed = currentLanguage !== lang;
  currentLanguage = lang;
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = translate("app.title", lang);
  document.querySelector('meta[name="description"]')?.setAttribute("content", translate("app.description", lang));
  if (changed) window.dispatchEvent(new CustomEvent(LANG_EVENT));
}
export function setStoredLang(lang: Lang) {
  if (lang !== "en" && lang !== "zh") return;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(LANG_KEY, lang); } catch { /* Retain the session choice when storage is unavailable. */ }
  }
  applyLanguage(lang);
}
export function applyStoredLang() { applyLanguage(getStoredLang()); }
export function translate(key: string, lang: Lang = DEFAULT_LANGUAGE, params?: MessageParams): string {
  const value = dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
  return value.replace(/\{(\w+)\}/g, (token, name: string) => {
    if (!params || !(name in params)) return token;
    const item = params[name];
    return item == null || typeof item === "boolean" ? "" : String(item);
  });
}
/** Runtime UI copy. Never pass user-authored text as a translation key. */
export const uiText: TFunc = (key, params) => translate(key, currentLanguage, params);
export const formatDate = (value: Date | number | string, options: Intl.DateTimeFormatOptions = {}, lang: Lang = currentLanguage) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(languageTag(lang), options).format(date);
};
/** Localize a known application error, leaving unknown provider/user text intact. */
export function localizeExternal(value: string, lang: Lang = currentLanguage): string {
  if (!value) return value;
  for (const key of Object.keys(en)) {
    const english = dictionaries.en[key], chinese = dictionaries.zh[key];
    if (english === value || chinese === value) return translate(key, lang);
  }
  for (const key of Object.keys(en)) {
    for (const source of [dictionaries.en[key], dictionaries.zh[key]]) {
      if (!source || !/\{\w+\}/.test(source)) continue;
      const names: string[] = [];
      const parts = source.split(/(\{\w+\})/g);
      const pattern = parts.map(part => {
        if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return "([\\s\\S]*?)"; }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("");
      if (source.replace(/\{\w+\}/g, "").trim().length < 4) continue;
      const match = new RegExp("^" + pattern + "$", "u").exec(value);
      if (match) return translate(key, lang, Object.fromEntries(names.map((name, index) => [name, match[index + 1]])));
    }
  }
  // Validation messages sometimes append a specific field detail to a prefix.
  for (const key of Object.keys(en).filter(key => key.startsWith("server."))) {
    for (const source of [dictionaries.en[key], dictionaries.zh[key]]) {
      if (source && /[:：]\s*$/.test(source) && value.startsWith(source)) return translate(key, lang) + localizeExternal(value.slice(source.length), lang);
    }
  }
  return value;
}
export function requestLanguage(request: Request): Lang {
  return request.headers.get("x-butler-language") === "zh" ? "zh" : "en";
}
/** Adds the interface language only to this app's API requests. */
export function appFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const local = raw.startsWith("/api/") || typeof window !== "undefined" && raw.startsWith(window.location.origin + "/api/");
  if (!local) return globalThis.fetch(input, init);
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
  headers.set("x-butler-language", getUiLanguage());
  return globalThis.fetch(input, { ...init, headers });
}
export const messageCatalogs = dictionaries;
export function stateLabel(value: string, lang: Lang = currentLanguage): string {
  return translate("state." + value, lang) === "state." + value ? value : translate("state." + value, lang);
}
