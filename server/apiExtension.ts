import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { useCases, screenshots, categories, useCaseCategories, aiScores, collections, collectionUseCases } from "../drizzle/schema";
import { eq, and, inArray, asc, desc, sql } from "drizzle-orm";

const extensionRouter = Router();

/**
 * GET /api/extension/use-cases
 *
 * Public read-only endpoint for the Chrome extension.
 * Returns approved use cases with essential fields for browsing and tab opening.
 *
 * Query params:
 *   - category: category slug to filter by
 *   - search: search term for title/description
 *   - sort: "popular" | "newest" | "top_rated" (default: "popular")
 *   - limit: max items to return (default: 50, max: 200)
 *   - offset: pagination offset (default: 0)
 */
extensionRouter.get("/extension/use-cases", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const {
      category,
      search,
      sort = "popular",
      limit: limitStr = "50",
      offset: offsetStr = "0",
    } = req.query as Record<string, string>;

    const limit = Math.min(parseInt(limitStr) || 50, 200);
    const offset = parseInt(offsetStr) || 0;

    // Build conditions
    const conditions: any[] = [eq(useCases.status, "approved")];

    // Category filter
    let categoryFilterIds: number[] | null = null;
    if (category) {
      const catRows = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, category));
      if (catRows.length > 0) {
        const ucCatRows = await db
          .select({ useCaseId: useCaseCategories.useCaseId })
          .from(useCaseCategories)
          .where(eq(useCaseCategories.categoryId, catRows[0].id));
        categoryFilterIds = ucCatRows.map((r) => r.useCaseId);
        if (categoryFilterIds.length === 0) {
          return res.json({ useCases: [], total: 0 });
        }
        conditions.push(inArray(useCases.id, categoryFilterIds));
      }
    }

    // Search filter
    if (search) {
      conditions.push(
        sql`(${useCases.title} LIKE ${`%${search}%`} OR ${useCases.description} LIKE ${`%${search}%`})`
      );
    }

    // Sort
    let orderBy: any;
    switch (sort) {
      case "newest":
        orderBy = desc(useCases.createdAt);
        break;
      case "top_rated":
        orderBy = desc(useCases.upvoteCount);
        break;
      case "popular":
      default:
        orderBy = desc(useCases.viewCount);
        break;
    }

    // Count total
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(useCases)
      .where(and(...conditions));
    const total = countResult[0]?.count || 0;

    // Fetch use cases
    const rows = await db
      .select({
        id: useCases.id,
        title: useCases.title,
        slug: useCases.slug,
        description: useCases.description,
        sessionReplayUrl: useCases.sessionReplayUrl,
        deliverableUrl: useCases.deliverableUrl,
        isHighlight: useCases.isHighlight,
        upvoteCount: useCases.upvoteCount,
        viewCount: useCases.viewCount,
        createdAt: useCases.createdAt,
      })
      .from(useCases)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    if (rows.length === 0) {
      return res.json({ useCases: [], total });
    }

    const ucIds = rows.map((r) => r.id);

    // Fetch first screenshot for each
    const ssRows = await db
      .select({
        useCaseId: screenshots.useCaseId,
        url: screenshots.url,
      })
      .from(screenshots)
      .where(inArray(screenshots.useCaseId, ucIds))
      .orderBy(asc(screenshots.sortOrder));

    const ssMap = new Map<number, string>();
    for (const s of ssRows) {
      if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, s.url);
    }

    // Fetch categories for each
    const catRows = await db
      .select({
        useCaseId: useCaseCategories.useCaseId,
        name: categories.name,
        slug: categories.slug,
        type: categories.type,
      })
      .from(useCaseCategories)
      .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
      .where(inArray(useCaseCategories.useCaseId, ucIds));

    const catMap = new Map<number, { name: string; slug: string; type: string }[]>();
    for (const c of catRows) {
      if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []);
      catMap.get(c.useCaseId)!.push({ name: c.name, slug: c.slug, type: c.type });
    }

    // Fetch AI scores
    const scoreRows = await db
      .select({
        useCaseId: aiScores.useCaseId,
        overallScore: aiScores.overallScore,
      })
      .from(aiScores)
      .where(inArray(aiScores.useCaseId, ucIds));

    const scoreMap = new Map<number, string>();
    for (const s of scoreRows) {
      scoreMap.set(s.useCaseId, s.overallScore);
    }

    // Compose response
    const result = rows.map((uc) => ({
      id: uc.id,
      title: uc.title,
      slug: uc.slug,
      description: uc.description?.substring(0, 200) || "",
      sessionReplayUrl: uc.sessionReplayUrl,
      deliverableUrl: uc.deliverableUrl,
      thumbnailUrl: ssMap.get(uc.id) || null,
      categories: catMap.get(uc.id) || [],
      score: scoreMap.get(uc.id) || null,
      upvotes: uc.upvoteCount,
      views: uc.viewCount,
      isHighlight: uc.isHighlight,
      createdAt: uc.createdAt?.toISOString(),
    }));

    // Set CORS and cache headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=300"); // 5 min cache
    res.json({ useCases: result, total });
  } catch (err: any) {
    console.error("[Extension API] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/extension/categories
 *
 * Public read-only endpoint returning all categories.
 */
extensionRouter.get("/extension/categories", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        type: categories.type,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder));

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=3600"); // 1 hour cache
    res.json({ categories: rows });
  } catch (err: any) {
    console.error("[Extension API] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/extension/collections
 *
 * Public read-only endpoint returning published collections with their use cases.
 */
extensionRouter.get("/extension/collections", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const collRows = await db
      .select()
      .from(collections)
      .where(eq(collections.isPublished, true))
      .orderBy(asc(collections.sortOrder));

    if (collRows.length === 0) {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cache-Control", "public, max-age=300");
      return res.json({ collections: [] });
    }

    const collIds = collRows.map((c) => c.id);

    // Fetch use cases in each collection
    const cuRows = await db
      .select({
        collectionId: collectionUseCases.collectionId,
        useCaseId: collectionUseCases.useCaseId,
        sortOrder: collectionUseCases.sortOrder,
      })
      .from(collectionUseCases)
      .where(inArray(collectionUseCases.collectionId, collIds))
      .orderBy(asc(collectionUseCases.sortOrder));

    const ucIds = Array.from(new Set(cuRows.map((r) => r.useCaseId)));

    let ucMap = new Map<number, { id: number; title: string; slug: string; sessionReplayUrl: string | null; deliverableUrl: string | null }>();
    if (ucIds.length > 0) {
      const ucRows = await db
        .select({
          id: useCases.id,
          title: useCases.title,
          slug: useCases.slug,
          sessionReplayUrl: useCases.sessionReplayUrl,
          deliverableUrl: useCases.deliverableUrl,
        })
        .from(useCases)
        .where(and(inArray(useCases.id, ucIds), eq(useCases.status, "approved")));

      for (const uc of ucRows) {
        ucMap.set(uc.id, uc);
      }
    }

    const cuMap = new Map<number, typeof ucMap extends Map<number, infer V> ? V[] : never>();
    for (const cu of cuRows) {
      const uc = ucMap.get(cu.useCaseId);
      if (!uc) continue;
      if (!cuMap.has(cu.collectionId)) cuMap.set(cu.collectionId, []);
      cuMap.get(cu.collectionId)!.push(uc);
    }

    const result = collRows.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      useCases: cuMap.get(c.id) || [],
      count: (cuMap.get(c.id) || []).length,
    }));

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=300");
    res.json({ collections: result });
  } catch (err: any) {
    console.error("[Extension API] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Handle CORS preflight
extensionRouter.options("/extension/*", (_req: Request, res: Response) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).end();
});

export { extensionRouter };
