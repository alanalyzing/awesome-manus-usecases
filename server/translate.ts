import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { useCaseTranslations } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const TARGET_LOCALES = ["en", "zh", "ja", "ko", "pt-BR"] as const;

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  zh: "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  "pt-BR": "Brazilian Portuguese",
};

/**
 * Translate a use case title and description into all target locales.
 * Skips the source language (stores original as-is).
 * Uses a single LLM call to translate into all target languages at once.
 */
export async function translateUseCase(
  useCaseId: number,
  originalTitle: string,
  originalDescription: string,
  sourceLanguage: string
): Promise<void> {
  // Normalize source language
  const srcLocale = normalizeLocale(sourceLanguage);

  // Store the original content as the source locale translation
  await upsertTranslation(useCaseId, srcLocale, originalTitle, originalDescription);

  // Determine which locales need translation
  const targetLocales = TARGET_LOCALES.filter((l) => l !== srcLocale);

  if (targetLocales.length === 0) return;

  try {
    const targetLangs = targetLocales.map((l) => `"${l}": "${LOCALE_NAMES[l]}"`).join(", ");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the given use case title and description into the requested languages. Maintain the original meaning, tone, and any markdown formatting. Keep brand names like "Manus" untranslated. Return a JSON object with locale codes as keys.`,
        },
        {
          role: "user",
          content: `Translate the following use case content into these languages: {${targetLangs}}

Title: ${originalTitle}

Description:
${originalDescription}

Return a JSON object where each key is a locale code and the value is an object with "title" and "description" fields. Example format:
{
  "zh": { "title": "...", "description": "..." },
  "ja": { "title": "...", "description": "..." }
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "translations",
          strict: true,
          schema: {
            type: "object",
            properties: Object.fromEntries(
              targetLocales.map((locale) => [
                locale,
                {
                  type: "object",
                  properties: {
                    title: { type: "string", description: `Title in ${LOCALE_NAMES[locale]}` },
                    description: { type: "string", description: `Description in ${LOCALE_NAMES[locale]}` },
                  },
                  required: ["title", "description"],
                  additionalProperties: false,
                },
              ])
            ),
            required: [...targetLocales],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) {
      console.error("[translate] No content in LLM response");
      return;
    }
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const translations = JSON.parse(content);

    // Upsert all translations
    for (const locale of targetLocales) {
      const t = translations[locale];
      if (t?.title && t?.description) {
        await upsertTranslation(useCaseId, locale, t.title, t.description);
      }
    }

    console.log(`[translate] Translated use case ${useCaseId} into ${targetLocales.join(", ")}`);
  } catch (err) {
    console.error(`[translate] Failed to translate use case ${useCaseId}:`, err);
    // Non-blocking: translations are a nice-to-have, not critical
  }
}

/**
 * Get translations for a use case in a specific locale.
 * Falls back to the original content if no translation exists.
 */
export async function getTranslation(
  useCaseId: number,
  locale: string
): Promise<{ title: string; description: string } | null> {
  const normalized = normalizeLocale(locale);
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ title: useCaseTranslations.title, description: useCaseTranslations.description })
    .from(useCaseTranslations)
    .where(and(eq(useCaseTranslations.useCaseId, useCaseId), eq(useCaseTranslations.locale, normalized)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get all translations for a use case.
 */
export async function getAllTranslations(
  useCaseId: number
): Promise<Record<string, { title: string; description: string }>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select({
      locale: useCaseTranslations.locale,
      title: useCaseTranslations.title,
      description: useCaseTranslations.description,
    })
    .from(useCaseTranslations)
    .where(eq(useCaseTranslations.useCaseId, useCaseId));

  const result: Record<string, { title: string; description: string }> = {};
  for (const row of rows) {
    result[row.locale] = { title: row.title, description: row.description };
  }
  return result;
}

/**
 * Get translations for multiple use cases in a specific locale.
 * Returns a map of useCaseId -> { title, description }.
 */
export async function getBulkTranslations(
  useCaseIds: number[],
  locale: string
): Promise<Record<number, { title: string; description: string }>> {
  if (useCaseIds.length === 0) return {};
  const normalized = normalizeLocale(locale);
  if (normalized === "en") return {}; // English is the source, no translation needed
  const db = await getDb();
  if (!db) return {};
  const { inArray } = await import("drizzle-orm");
  const rows = await db
    .select({
      useCaseId: useCaseTranslations.useCaseId,
      title: useCaseTranslations.title,
      description: useCaseTranslations.description,
    })
    .from(useCaseTranslations)
    .where(
      and(
        inArray(useCaseTranslations.useCaseId, useCaseIds),
        eq(useCaseTranslations.locale, normalized)
      )
    );

  const result: Record<number, { title: string; description: string }> = {};
  for (const row of rows) {
    result[row.useCaseId] = { title: row.title, description: row.description };
  }
  return result;
}

async function upsertTranslation(
  useCaseId: number,
  locale: string,
  title: string,
  description: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Use INSERT ... ON DUPLICATE KEY UPDATE
  await db
    .insert(useCaseTranslations)
    .values({ useCaseId, locale, title, description })
    .onDuplicateKeyUpdate({
      set: { title, description },
    });
}

function normalizeLocale(lang: string): string {
  const lower = lang.toLowerCase().trim();
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("ko")) return "ko";
  return "en";
}
