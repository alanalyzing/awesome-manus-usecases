import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { useCases, screenshots, useCaseCategories, categories } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const rssRouter = Router();

/**
 * GET /api/rss
 *
 * Returns an RSS 2.0 XML feed of the latest approved use cases.
 * No authentication required.
 */
rssRouter.get("/rss", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).send("Database not available");
    }

    // Fetch the latest 50 approved use cases
    const rows = await db
      .select({
        id: useCases.id,
        title: useCases.title,
        slug: useCases.slug,
        description: useCases.description,
        aiSummary: useCases.aiSummary,
        createdAt: useCases.createdAt,
        updatedAt: useCases.updatedAt,
      })
      .from(useCases)
      .where(eq(useCases.status, "approved"))
      .orderBy(desc(useCases.createdAt))
      .limit(50);

    // Get the base URL from the request
    const protocol = _req.headers["x-forwarded-proto"] || "https";
    const host = _req.headers["x-forwarded-host"] || ((_req.headers.host && !_req.headers.host.includes("run.app")) ? _req.headers.host : "awesome.manus.space");
    const baseUrl = `${protocol}://${host}`;

    // Build RSS XML
    const now = new Date().toUTCString();
    const items = rows
      .map((uc) => {
        const pubDate = new Date(uc.createdAt).toUTCString();
        const description = escapeXml(uc.aiSummary || uc.description || "");
        const title = escapeXml(uc.title);
        const link = `${baseUrl}/use-case/${uc.slug}`;
        return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
      })
      .join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Awesome Manus Use Cases</title>
    <link>${baseUrl}</link>
    <description>The latest use cases from the Manus Use Case Library, showcasing what Manus can do across industries and workflows.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    return res.send(rss);
  } catch (error: any) {
    console.error("[RSS Feed] Error:", error);
    return res.status(500).send("Internal server error");
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export { rssRouter };
