import { Router, Request, Response } from "express";
import { ENV } from "./_core/env";
import { createUseCase, getCategoryIdsBySlugs, getOrCreateApiSubmitter, getDb } from "./db";
import { categories } from "../drizzle/schema";
import { asc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

const apiRouter = Router();

/**
 * POST /api/submit
 *
 * Public API endpoint for programmatic use case submission.
 * Designed for Manus agents running in sandboxes that cannot interact with browser file dialogs.
 *
 * Authentication: Bearer token via API_SUBMIT_KEY env var
 *
 * Body (JSON):
 * {
 *   "title": "My Use Case",
 *   "description": "What it does...",
 *   "sessionReplayUrl": "https://manus.im/share/...",
 *   "deliverableUrl": "https://...",
 *   "language": "en",
 *   "categorySlugs": ["marketing", "finance"],
 *   "screenshotUrls": ["https://cdn.example.com/img1.png", "https://cdn.example.com/img2.png"],
 *   "submitterName": "Agent Name",
 *   "submitterEmail": "agent@example.com"
 * }
 *
 * Example curl:
 * curl -X POST https://your-domain.manus.space/api/submit \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"title":"...","description":"...","categorySlugs":["marketing"],"screenshotUrls":["https://..."]}'
 */
apiRouter.post("/submit", async (req: Request, res: Response) => {
  try {
    // ─── Auth check ───
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Missing or invalid Authorization header. Use: Bearer YOUR_API_KEY",
      });
    }
    const token = authHeader.slice(7).trim();
    if (!ENV.apiSubmitKey || token !== ENV.apiSubmitKey) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    // ─── Validate body ───
    const {
      title,
      description,
      sessionReplayUrl,
      deliverableUrl,
      language = "en",
      categorySlugs = [],
      screenshotUrls = [],
      submitterName = "API Submission",
      submitterEmail,
      consentToContact = false,
    } = req.body;

    // Required fields
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "title is required (string, non-empty)" });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "title must be 200 characters or less" });
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return res.status(400).json({ error: "description is required (string, non-empty)" });
    }
    if (description.length > 5000) {
      return res.status(400).json({ error: "description must be 5000 characters or less" });
    }

    // Validate URLs
    if (sessionReplayUrl && typeof sessionReplayUrl === "string") {
      try { new URL(sessionReplayUrl); } catch {
        return res.status(400).json({ error: "sessionReplayUrl must be a valid URL" });
      }
    }
    if (deliverableUrl && typeof deliverableUrl === "string") {
      try { new URL(deliverableUrl); } catch {
        return res.status(400).json({ error: "deliverableUrl must be a valid URL" });
      }
    }

    // Validate categorySlugs
    if (!Array.isArray(categorySlugs) || categorySlugs.length === 0) {
      return res.status(400).json({
        error: "categorySlugs is required (array of category slug strings, at least 1)",
        hint: "Use GET /api/categories to see available category slugs",
      });
    }
    for (const slug of categorySlugs) {
      if (typeof slug !== "string") {
        return res.status(400).json({ error: "Each categorySlugs entry must be a string" });
      }
    }

    // Validate screenshotUrls
    if (!Array.isArray(screenshotUrls) || screenshotUrls.length === 0) {
      return res.status(400).json({
        error: "screenshotUrls is required (array of image URL strings, at least 1)",
        hint: "Upload images first using manus-upload-file, then pass the CDN URLs here",
      });
    }
    if (screenshotUrls.length > 5) {
      return res.status(400).json({ error: "Maximum 5 screenshot URLs allowed" });
    }
    for (const url of screenshotUrls) {
      if (typeof url !== "string") {
        return res.status(400).json({ error: "Each screenshotUrls entry must be a string" });
      }
      try { new URL(url); } catch {
        return res.status(400).json({ error: `Invalid screenshot URL: ${url}` });
      }
    }

    // ─── Resolve category slugs to IDs ───
    const categoryIds = await getCategoryIdsBySlugs(categorySlugs);
    if (categoryIds.length === 0) {
      return res.status(400).json({
        error: `No matching categories found for slugs: ${categorySlugs.join(", ")}`,
        hint: "Use GET /api/categories to see available category slugs",
      });
    }

    const unmatchedSlugs = categorySlugs.filter(
      (s: string) => !categoryIds.some((c: { slug: string }) => c.slug === s)
    );

    // ─── Create or find submitter user ───
    const submitter = await getOrCreateApiSubmitter({
      name: submitterName,
      email: submitterEmail || undefined,
    });

    // ─── Build screenshot data ───
    const screenshotData = screenshotUrls.map((url: string) => ({
      url,
      fileKey: `api-submit/${new URL(url).pathname.split("/").pop() || "screenshot.png"}`,
    }));

    // ─── Create the use case ───
    const useCase = await createUseCase({
      title: title.trim(),
      description: description.trim(),
      sessionReplayUrl: sessionReplayUrl || undefined,
      deliverableUrl: deliverableUrl || undefined,
      language,
      consentToContact,
      submitterId: submitter.id,
      categoryIds: categoryIds.map((c: { id: number }) => c.id),
      screenshotData,
    });

    // ─── Notify owner ───
    try {
      await notifyOwner({
        title: `New API Submission: ${title}`,
        content: `A new use case has been submitted via API by ${submitterName} (${submitterEmail || "no email"}).\n\nTitle: ${title}\n\nPlease review it in the admin moderation queue.`,
      });
    } catch (e) {
      console.warn("[Notification] Failed to notify owner:", e);
    }

    // ─── Return success ───
    return res.status(201).json({
      success: true,
      slug: useCase.slug,
      message: "Use case submitted successfully. It will appear in the gallery after admin approval.",
      ...(unmatchedSlugs.length > 0 && {
        warnings: [`These category slugs were not found and were skipped: ${unmatchedSlugs.join(", ")}`],
      }),
    });
  } catch (error: any) {
    console.error("[API Submit] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message || "An unexpected error occurred",
    });
  }
});

/**
 * GET /api/categories
 *
 * Returns all available categories with their slugs.
 * No authentication required — helps agents discover valid category slugs.
 */
apiRouter.get("/categories", async (_req: Request, res: Response) => {
  try {
    const allCategories = await getAllCategoriesForApi();
    return res.json({
      categories: allCategories,
      hint: "Use the 'slug' field values in the categorySlugs array when submitting via POST /api/submit",
    });
  } catch (error: any) {
    console.error("[API Categories] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { apiRouter };

// ─── Helper: get all categories for API ───
async function getAllCategoriesForApi() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: categories.id,
    name: categories.name,
    slug: categories.slug,
    type: categories.type,
  }).from(categories).orderBy(asc(categories.name));
  return rows;
}
