import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { useCases, categories } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const sitemapRouter = Router();

/**
 * GET /sitemap.xml
 *
 * Returns a dynamic XML sitemap listing all approved use cases,
 * category pages, and static pages for search engine indexing.
 */
sitemapRouter.get("/sitemap.xml", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).send("Database not available");
    }

    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Fetch all approved use cases
    const ucRows = await db
      .select({
        slug: useCases.slug,
        updatedAt: useCases.updatedAt,
        createdAt: useCases.createdAt,
      })
      .from(useCases)
      .where(eq(useCases.status, "approved"));

    // Fetch all categories
    const catRows = await db
      .select({
        slug: categories.slug,
      })
      .from(categories);

    // Static pages
    const staticPages = [
      { loc: "/", changefreq: "daily", priority: "1.0" },
      { loc: "/about", changefreq: "monthly", priority: "0.6" },
      { loc: "/submit", changefreq: "monthly", priority: "0.7" },
      { loc: "/leaderboard", changefreq: "weekly", priority: "0.6" },
      { loc: "/api-docs", changefreq: "monthly", priority: "0.5" },
    ];

    const urls: string[] = [];

    // Add static pages
    for (const page of staticPages) {
      urls.push(`  <url>
    <loc>${escapeXml(baseUrl + page.loc)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
    }

    // Add use case detail pages
    for (const uc of ucRows) {
      const lastmod = formatDate(uc.updatedAt || uc.createdAt);
      urls.push(`  <url>
    <loc>${escapeXml(baseUrl + "/use-case/" + uc.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // Add category filter pages (as homepage with category filter)
    for (const cat of catRows) {
      urls.push(`  <url>
    <loc>${escapeXml(baseUrl + "/?category=" + cat.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`);
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    return res.send(sitemap);
  } catch (error: any) {
    console.error("[Sitemap] Error:", error);
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

function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD format
}

export { sitemapRouter };
