/**
 * Backfill translations for all approved use cases.
 * Run: node server/backfill-translations.mjs
 *
 * This script connects to the database, finds all approved use cases
 * that don't have translations yet, and generates translations via LLM.
 */
import { config } from "dotenv";
config({ path: ".env" });

// We need to use the raw DB connection since this is a standalone script
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FORGE_API_URL || !FORGE_API_KEY) {
  console.error("BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY not set");
  process.exit(1);
}

const TARGET_LOCALES = ["zh", "ja", "ko", "pt-BR"];
const LOCALE_NAMES = {
  zh: "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  "pt-BR": "Brazilian Portuguese",
};

async function invokeLLM(messages, response_format) {
  const res = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      messages,
      response_format,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  // Parse DATABASE_URL for mysql2
  const url = new URL(DATABASE_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: true },
  });

  console.log("Connected to database");

  // Get all approved use cases
  const [useCases] = await connection.execute(
    "SELECT id, title, description, language FROM use_cases WHERE status = 'approved' ORDER BY id"
  );

  console.log(`Found ${useCases.length} approved use cases`);

  // Get existing translations to skip already-translated ones
  const [existingTranslations] = await connection.execute(
    "SELECT useCaseId, locale FROM use_case_translations"
  );

  const existingSet = new Set(
    existingTranslations.map((t) => `${t.useCaseId}:${t.locale}`)
  );

  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (const uc of useCases) {
    // Check which locales need translation
    const missingLocales = TARGET_LOCALES.filter(
      (l) => !existingSet.has(`${uc.id}:${l}`)
    );

    // Also check if EN source is stored
    if (!existingSet.has(`${uc.id}:en`)) {
      // Store original as EN
      await connection.execute(
        `INSERT INTO use_case_translations (useCaseId, locale, title, description)
         VALUES (?, 'en', ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
        [uc.id, uc.title, uc.description || ""]
      );
    }

    if (missingLocales.length === 0) {
      skipped++;
      continue;
    }

    console.log(
      `[${translated + skipped + failed + 1}/${useCases.length}] Translating use case ${uc.id}: "${uc.title}" into ${missingLocales.join(", ")}...`
    );

    try {
      const targetLangs = missingLocales
        .map((l) => `"${l}": "${LOCALE_NAMES[l]}"`)
        .join(", ");

      const response = await invokeLLM(
        [
          {
            role: "system",
            content: `You are a professional translator. Translate the given use case title and description into the requested languages. Maintain the original meaning, tone, and any markdown formatting. Keep brand names like "Manus" untranslated. Return a JSON object with locale codes as keys.`,
          },
          {
            role: "user",
            content: `Translate the following use case content into these languages: {${targetLangs}}

Title: ${uc.title}

Description:
${uc.description || ""}

Return a JSON object where each key is a locale code and the value is an object with "title" and "description" fields. Example format:
{
  "zh": { "title": "...", "description": "..." },
  "ja": { "title": "...", "description": "..." }
}`,
          },
        ],
        {
          type: "json_schema",
          json_schema: {
            name: "translations",
            strict: true,
            schema: {
              type: "object",
              properties: Object.fromEntries(
                missingLocales.map((locale) => [
                  locale,
                  {
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                        description: `Title in ${LOCALE_NAMES[locale]}`,
                      },
                      description: {
                        type: "string",
                        description: `Description in ${LOCALE_NAMES[locale]}`,
                      },
                    },
                    required: ["title", "description"],
                    additionalProperties: false,
                  },
                ])
              ),
              required: [...missingLocales],
              additionalProperties: false,
            },
          },
        }
      );

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        console.error(`  No content in LLM response for use case ${uc.id}`);
        failed++;
        continue;
      }

      const translations = JSON.parse(
        typeof content === "string" ? content : JSON.stringify(content)
      );

      for (const locale of missingLocales) {
        const t = translations[locale];
        if (t?.title && t?.description) {
          await connection.execute(
            `INSERT INTO use_case_translations (useCaseId, locale, title, description)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
            [uc.id, locale, t.title, t.description]
          );
        }
      }

      translated++;
      console.log(`  ✓ Translated use case ${uc.id}`);

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`  ✗ Failed to translate use case ${uc.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\nDone! Translated: ${translated}, Skipped: ${skipped}, Failed: ${failed}`);
  await connection.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
