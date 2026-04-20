import { Router, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getCategoryIdsBySlugs, getDb, updateUseCaseAdmin, addScreenshotToUseCase, getUseCaseBySessionUrl } from "./db";
import { useCases } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const updateRouter = Router();

/**
 * Helper: authenticate API request
 */
function authenticateApiKey(req: Request, res: Response): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header. Use: Bearer YOUR_API_KEY" });
    return false;
  }
  const token = authHeader.slice(7).trim();
  if (!ENV.apiSubmitKey || token !== ENV.apiSubmitKey) {
    res.status(403).json({ error: "Invalid API key" });
    return false;
  }
  return true;
}

/**
 * Helper: resolve use case by id, slug, or sessionReplayUrl
 */
async function resolveUseCase(
  identifier: { id?: number; slug?: string; sessionReplayUrl?: string }
): Promise<{ id: number; slug: string } | { error: string; status: number }> {
  const db = await getDb();
  if (!db) return { error: "Database not available", status: 500 };

  if (identifier.id !== undefined) {
    if (typeof identifier.id !== "number" || identifier.id <= 0) {
      return { error: "id must be a positive integer", status: 400 };
    }
    const rows = await db.select({ id: useCases.id, slug: useCases.slug }).from(useCases).where(eq(useCases.id, identifier.id)).limit(1);
    if (rows.length === 0) return { error: `Use case not found with id: ${identifier.id}`, status: 404 };
    return { id: rows[0].id, slug: rows[0].slug };
  }

  if (identifier.slug !== undefined) {
    if (typeof identifier.slug !== "string" || identifier.slug.trim().length === 0) {
      return { error: "slug must be a non-empty string", status: 400 };
    }
    const rows = await db.select({ id: useCases.id, slug: useCases.slug }).from(useCases).where(eq(useCases.slug, identifier.slug)).limit(1);
    if (rows.length === 0) return { error: `Use case not found with slug: ${identifier.slug}`, status: 404 };
    return { id: rows[0].id, slug: rows[0].slug };
  }

  if (identifier.sessionReplayUrl !== undefined) {
    if (typeof identifier.sessionReplayUrl !== "string" || identifier.sessionReplayUrl.trim().length === 0) {
      return { error: "sessionReplayUrl must be a non-empty string", status: 400 };
    }
    const found = await getUseCaseBySessionUrl(identifier.sessionReplayUrl);
    if (!found) return { error: `Use case not found with sessionReplayUrl: ${identifier.sessionReplayUrl}`, status: 404 };
    return { id: found.id, slug: found.slug };
  }

  return { error: "Must provide one of: id (number), slug (string), or sessionReplayUrl (string) to identify the use case", status: 400 };
}

/**
 * Helper: apply update fields to a use case
 */
async function applyUpdate(
  useCaseId: number,
  updateFields: Record<string, any>
): Promise<{ updated: string[]; screenshotsAdded: number; warnings: string[] }> {
  const { title, description, sessionReplayUrl, deliverableUrl, categorySlugs, screenshotUrls } = updateFields;
  const updateData: Record<string, any> = {};
  const warnings: string[] = [];

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0) throw new Error("title must be a non-empty string");
    if (title.length > 200) throw new Error("title must be 200 characters or less");
    updateData.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== "string" || description.trim().length === 0) throw new Error("description must be a non-empty string");
    if (description.length > 5000) throw new Error("description must be 5000 characters or less");
    updateData.description = description.trim();
  }
  if (sessionReplayUrl !== undefined) {
    if (sessionReplayUrl !== null && typeof sessionReplayUrl === "string" && sessionReplayUrl.length > 0) {
      try { new URL(sessionReplayUrl); } catch { throw new Error("sessionReplayUrl must be a valid URL"); }
    }
    updateData.sessionReplayUrl = sessionReplayUrl || undefined;
  }
  if (deliverableUrl !== undefined) {
    if (deliverableUrl !== null && typeof deliverableUrl === "string" && deliverableUrl.length > 0) {
      try { new URL(deliverableUrl); } catch { throw new Error("deliverableUrl must be a valid URL"); }
    }
    updateData.deliverableUrl = deliverableUrl || undefined;
  }

  // Resolve categories
  if (categorySlugs !== undefined) {
    if (!Array.isArray(categorySlugs) || categorySlugs.length === 0) {
      throw new Error("categorySlugs must be a non-empty array");
    }
    const categoryIds = await getCategoryIdsBySlugs(categorySlugs);
    if (categoryIds.length === 0) {
      throw new Error(`No matching categories for: ${categorySlugs.join(", ")}. Use GET /api/categories to see available slugs`);
    }
    const unmatchedSlugs = categorySlugs.filter(
      (s: string) => !categoryIds.some((c: { slug: string }) => c.slug === s)
    );
    if (unmatchedSlugs.length > 0) warnings.push(`Skipped unknown category slugs: ${unmatchedSlugs.join(", ")}`);
    updateData.categoryIds = categoryIds.map((c: { id: number }) => c.id);
  }

  // Apply core field updates
  if (Object.keys(updateData).length > 0) {
    await updateUseCaseAdmin(useCaseId, updateData);
  }

  // Append screenshots
  let screenshotsAdded = 0;
  if (screenshotUrls !== undefined) {
    if (!Array.isArray(screenshotUrls)) throw new Error("screenshotUrls must be an array");
    for (const url of screenshotUrls.slice(0, 5)) {
      if (typeof url !== "string") continue;
      try {
        new URL(url);
        const fileKey = `api-patch/${new URL(url).pathname.split("/").pop() || "screenshot.png"}`;
        await addScreenshotToUseCase(useCaseId, url, fileKey);
        screenshotsAdded++;
      } catch {
        warnings.push(`Skipped invalid screenshot URL: ${url}`);
      }
    }
  }

  return {
    updated: Object.keys(updateData).filter(k => k !== "categoryIds"),
    screenshotsAdded,
    warnings,
  };
}

/**
 * PATCH /api/update
 *
 * Flexible update endpoint that supports lookup by id, slug, or sessionReplayUrl.
 * Designed for programmatic backfilling of fields like deliverableUrl across many use cases.
 *
 * Authentication: Bearer token via API_SUBMIT_KEY env var
 *
 * Body (JSON):
 * {
 *   "id": 42,                           // lookup by id (highest priority)
 *   "slug": "my-use-case",              // lookup by slug (second priority)
 *   "sessionReplayUrl": "https://manus.im/share/...",  // lookup by session URL (third priority)
 *   "deliverableUrl": "https://...",    // fields to update (all optional)
 *   "title": "Updated Title",
 *   "description": "Updated description...",
 *   "categorySlugs": ["marketing"],
 *   "screenshotUrls": ["https://..."]   // appended, not replaced
 * }
 *
 * Note: When using sessionReplayUrl as the lookup key, you can also update the
 * sessionReplayUrl itself by providing a new value — the lookup happens first.
 *
 * Example curl:
 * curl -X PATCH https://manuslib-jnjq5dyo.manus.space/api/update \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"sessionReplayUrl":"https://manus.im/share/abc","deliverableUrl":"https://example.com/result"}'
 */
updateRouter.patch("/update", async (req: Request, res: Response) => {
  try {
    if (!authenticateApiKey(req, res)) return;

    const { id, slug, sessionReplayUrl: lookupSessionUrl, ...updateFields } = req.body;

    // Resolve use case
    const resolved = await resolveUseCase({ id, slug, sessionReplayUrl: lookupSessionUrl });
    if ("error" in resolved) {
      return res.status(resolved.status).json({ error: resolved.error });
    }

    // Apply updates
    try {
      const result = await applyUpdate(resolved.id, updateFields);
      return res.json({
        success: true,
        id: resolved.id,
        slug: resolved.slug,
        updated: result.updated,
        ...(result.updated.length === 0 && result.screenshotsAdded === 0 && { note: "No fields were updated" }),
        ...(result.screenshotsAdded > 0 && { screenshotsAdded: result.screenshotsAdded }),
        ...(result.warnings.length > 0 && { warnings: result.warnings }),
      });
    } catch (validationError: any) {
      return res.status(400).json({ error: validationError.message });
    }
  } catch (error: any) {
    console.error("[API Update] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/update/bulk
 *
 * Bulk update endpoint — accepts an array of update operations in one call.
 * Each item must include an identifier (id, slug, or sessionReplayUrl) and fields to update.
 * Maximum 50 items per request.
 *
 * Authentication: Bearer token via API_SUBMIT_KEY env var
 *
 * Body (JSON):
 * {
 *   "items": [
 *     { "sessionReplayUrl": "https://manus.im/share/abc", "deliverableUrl": "https://example.com/result1" },
 *     { "slug": "my-use-case", "title": "New Title" },
 *     { "id": 42, "deliverableUrl": "https://example.com/result2" },
 *     ...
 *   ]
 * }
 *
 * Example curl:
 * curl -X PATCH https://manuslib-jnjq5dyo.manus.space/api/update/bulk \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"items":[{"sessionReplayUrl":"https://manus.im/share/abc","deliverableUrl":"https://example.com/result"}]}'
 */
updateRouter.patch("/update/bulk", async (req: Request, res: Response) => {
  try {
    if (!authenticateApiKey(req, res)) return;

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items is required (array of update objects, at least 1)" });
    }
    if (items.length > 50) {
      return res.status(400).json({ error: "Maximum 50 items per bulk update request" });
    }

    const results: Array<{
      index: number;
      success: boolean;
      id?: number;
      slug?: string;
      updated?: string[];
      screenshotsAdded?: number;
      error?: string;
      warnings?: string[];
    }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const { id, slug, sessionReplayUrl: lookupSessionUrl, ...updateFields } = item;

        // Resolve use case
        const resolved = await resolveUseCase({ id, slug, sessionReplayUrl: lookupSessionUrl });
        if ("error" in resolved) {
          results.push({ index: i, success: false, error: resolved.error });
          continue;
        }

        // Apply updates
        const result = await applyUpdate(resolved.id, updateFields);
        results.push({
          index: i,
          success: true,
          id: resolved.id,
          slug: resolved.slug,
          updated: result.updated,
          ...(result.screenshotsAdded > 0 && { screenshotsAdded: result.screenshotsAdded }),
          ...(result.warnings.length > 0 && { warnings: result.warnings }),
        });
      } catch (err: any) {
        results.push({ index: i, success: false, error: "Unexpected error processing this item" });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return res.json({
      total: items.length,
      succeeded: successCount,
      failed: items.length - successCount,
      results,
    });
  } catch (error: any) {
    console.error("[API Bulk Update] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { updateRouter };
