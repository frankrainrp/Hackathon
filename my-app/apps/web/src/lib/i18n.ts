"use client";
import { useCallback, useEffect, useState } from "react";
import { applyStoredLang, getUiLanguage, LANG_EVENT, setStoredLang, translate, type Lang, type TFunc } from "./messages";
export { applyStoredLang, getStoredLang, setStoredLang, translate, LANG_KEY, LANG_EVENT } from "./messages";
export type { Lang, TFunc } from "./messages";

/** Every interface subscribes to the same persisted language preference. */
export function useT(): { t: TFunc; lang: Lang; setLang: (lang: Lang) => void } {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const sync = () => setLang(getUiLanguage());
    window.addEventListener(LANG_EVENT, sync);
    const storage = (event: StorageEvent) => { if (event.key === "butler.lang" || event.key === null) applyStoredLang(); };
    window.addEventListener("storage", storage);
    applyStoredLang(); sync();
    return () => { window.removeEventListener(LANG_EVENT, sync); window.removeEventListener("storage", storage); };
  }, []);
  const t = useCallback<TFunc>((key, params) => translate(key, lang, params), [lang]);
  return { t, lang, setLang: setStoredLang };
}
