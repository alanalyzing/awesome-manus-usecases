import { useState, useCallback, useMemo, type ReactNode } from "react";
import { I18nContext, getTranslation, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "manus-locale";

function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ["en", "zh", "ja", "ko", "pt-BR"].includes(stored)) {
      return stored as Locale;
    }
    const browserLang = navigator.language;
    if (browserLang.startsWith("zh")) return "zh";
    if (browserLang.startsWith("ja")) return "ja";
    if (browserLang.startsWith("ko")) return "ko";
    if (browserLang.startsWith("pt")) return "pt-BR";
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useMemo(() => getTranslation(locale), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
