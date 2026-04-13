import sharp from "sharp";
import { encode } from "blurhash";
import { getDb } from "./db";
import { screenshots } from "../drizzle/schema";
import { eq, isNull } from "drizzle-orm";

/**
 * Generate a blurhash string from an image URL.
 * Downloads the image, resizes to a small thumbnail, then encodes.
 */
export async function generateBlurhash(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());

    // Resize to small dimensions for fast encoding
    const { data, info } = await sharp(buffer)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const hash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4, // componentX
      3  // componentY
    );

    return hash;
  } catch (err) {
    console.error(`[Blurhash] Failed to generate for ${imageUrl}:`, err);
    return null;
  }
}

/**
 * Generate and store blurhash for a single screenshot by ID.
 */
export async function generateAndStoreBlurhash(screenshotId: number, imageUrl: string): Promise<string | null> {
  const hash = await generateBlurhash(imageUrl);
  if (hash) {
    const db = await getDb();
    await db!.update(screenshots).set({ blurhash: hash }).where(eq(screenshots.id, screenshotId));
  }
  return hash;
}

/**
 * Backfill blurhash for all screenshots that don't have one yet.
 * Processes in batches to avoid overwhelming the server.
 */
export async function backfillBlurhashes(batchSize = 10): Promise<{ processed: number; failed: number }> {
  const db = await getDb();
  let processed = 0;
  let failed = 0;

  while (true) {
    const batch = await db!
      .select({ id: screenshots.id, url: screenshots.url })
      .from(screenshots)
      .where(isNull(screenshots.blurhash))
      .limit(batchSize);

    if (batch.length === 0) break;

    for (const shot of batch) {
      const hash = await generateAndStoreBlurhash(shot.id, shot.url);
      if (hash) {
        processed++;
      } else {
        failed++;
        // Mark as empty string so we don't retry forever
        await db!.update(screenshots).set({ blurhash: "" }).where(eq(screenshots.id, shot.id));
      }
    }
  }

  return { processed, failed };
}
