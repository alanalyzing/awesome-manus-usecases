import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/lib/i18n";

/**
 * Hook that fetches translations for a list of use cases based on the current locale.
 * Returns a function to get translated title/description for a given use case ID.
 * For English locale, returns originals without any fetch.
 */
export function useTranslatedUseCases(useCaseIds: number[]) {
  const { locale } = useI18n();
  const isEnglish = locale === "en";

  // Only fetch translations for non-English locales
  const stableIds = useMemo(() => [...useCaseIds].sort(), [JSON.stringify(useCaseIds)]);

  const { data: translationsMap } = trpc.useCases.translations.useQuery(
    { useCaseIds: stableIds, locale },
    {
      enabled: !isEnglish && stableIds.length > 0,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  const getTranslated = useMemo(() => {
    return (id: number, original: { title: string; description: string }) => {
      if (isEnglish || !translationsMap) return original;
      const translation = translationsMap[id];
      if (!translation) return original;
      return {
        title: translation.title || original.title,
        description: translation.description || original.description,
      };
    };
  }, [isEnglish, translationsMap]);

  return { getTranslated, isTranslating: !isEnglish && !translationsMap && stableIds.length > 0 };
}
