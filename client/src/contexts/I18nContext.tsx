import { useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { I18nContext, getTranslation, type Locale } from "@/lib/i18n";

const STORAGE_KEY = "manus-locale";
const VALID_LOCALES: Locale[] = ["en", "zh", "ja", "ko", "pt-BR"];

function isValidLocale(value: string): value is Locale {
  return VALID_LOCALES.includes(value as Locale);
}

/**
 * Priority order for locale detection:
 * 1. ?lang= URL parameter (highest — allows shareable URLs)
 * 2. localStorage (user's previous choice)
 * 3. Browser language
 * 4. "en" (fallback)
 */
function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    // 1. Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get("lang");
    if (langParam) {
      // Normalize common variants
      const normalized = normalizeLangParam(langParam);
      if (normalized) return normalized;
    }

    // 2. Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidLocale(stored)) {
      return stored;
    }

    // 3. Check browser language
    const browserLang = navigator.language;
    if (browserLang.startsWith("zh")) return "zh";
    if (browserLang.startsWith("ja")) return "ja";
    if (browserLang.startsWith("ko")) return "ko";
    if (browserLang.startsWith("pt")) return "pt-BR";
  }
  return "en";
}

function normalizeLangParam(param: string): Locale | null {
  const lower = param.toLowerCase().trim();
  if (lower === "en" || lower === "english") return "en";
  if (lower === "zh" || lower === "zh-cn" || lower === "zh-hans" || lower === "chinese") return "zh";
  if (lower === "ja" || lower === "jp" || lower === "japanese") return "ja";
  if (lower === "ko" || lower === "kr" || lower === "korean") return "ko";
  if (lower === "pt" || lower === "pt-br" || lower === "portuguese") return "pt-BR";
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // Update URL parameter without page reload
    const url = new URL(window.location.href);
    url.searchParams.set("lang", newLocale);
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Listen for URL changes (e.g., back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const langParam = urlParams.get("lang");
      if (langParam) {
        const normalized = normalizeLangParam(langParam);
        if (normalized && normalized !== locale) {
          setLocaleState(normalized);
          localStorage.setItem(STORAGE_KEY, normalized);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [locale]);

  // On initial load, if ?lang= was set, persist to localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get("lang");
    if (langParam) {
      const normalized = normalizeLangParam(langParam);
      if (normalized) {
        localStorage.setItem(STORAGE_KEY, normalized);
      }
    }
  }, []);

  const t = useMemo(() => getTranslation(locale), [locale]);

  // Update document.title when locale changes
  useEffect(() => {
    document.title = t("nav.useCaseLibrary");
  }, [locale, t]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
