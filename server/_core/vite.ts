import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getUseCaseMetaBySlug } from "../db";

/** Build an absolute site URL from the request or fallback to known domain */
function getSiteOrigin(req?: express.Request): string {
  if (req) {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    if (host) return `${proto}://${host}`;
  }
  return "https://awesome.manus.space";
}

/** Inject dynamic OG meta tags and JSON-LD structured data for /use-case/:slug pages */
async function injectOgMeta(html: string, url: string, req?: express.Request): Promise<string> {
  const match = url.match(/^\/use-case\/([^?#]+)/);
  if (!match) return html;

  try {
    const slug = decodeURIComponent(match[1]);
    // Pass no visitorKey to avoid counting bot crawls as views
    const uc = await getUseCaseMetaBySlug(slug);
    if (!uc) return html;

    const origin = getSiteOrigin(req);
    const title = uc.title.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const rawDesc = (uc.description || '').replace(/\n/g, ' ').substring(0, 200);
    const desc = rawDesc.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const screenshot = uc.screenshots?.[0]?.url || '';
    const canonicalUrl = `${origin}/use-case/${encodeURIComponent(slug)}`;
    const siteName = "Awesome Manus Use Cases";

    // Use auto-generated OG image, fall back to screenshot
    const ogImageUrl = `${origin}/api/og-image/${encodeURIComponent(slug)}`;
    const image = ogImageUrl;

    const ogTags = [
      // Open Graph
      `<meta property="og:title" content="${title} \u2014 ${siteName}" />`,
      `<meta property="og:description" content="${desc}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:url" content="${canonicalUrl}" />`,
      `<meta property="og:site_name" content="${siteName}" />`,
      `<meta property="og:image" content="${image}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      // Twitter Card
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${desc}" />`,
      `<meta name="twitter:image" content="${image}" />`,
      // Standard meta
      `<meta name="description" content="${desc}" />`,
      // Canonical
      `<link rel="canonical" href="${canonicalUrl}" />`,
      // Title
      `<title>${title} \u2014 ${siteName}</title>`,
    ].filter(Boolean).join('\n    ');

    // JSON-LD structured data
    const jsonLdTitle = uc.title.replace(/"/g, '\\"').replace(/</g, '\\u003c');
    const jsonLdDesc = (uc.description || '').replace(/\n/g, ' ').substring(0, 300).replace(/"/g, '\\"').replace(/</g, '\\u003c');
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": uc.title,
      "description": (uc.description || '').replace(/\n/g, ' ').substring(0, 300),
      "url": canonicalUrl,
      "datePublished": uc.createdAt instanceof Date ? uc.createdAt.toISOString() : new Date(uc.createdAt).toISOString(),
      ...(uc.updatedAt ? { "dateModified": uc.updatedAt instanceof Date ? uc.updatedAt.toISOString() : new Date(uc.updatedAt).toISOString() } : {}),
      ...(screenshot ? { "image": screenshot } : {}),
      ...(uc.submitterName ? { "author": { "@type": "Person", "name": uc.submitterName } } : {}),
      ...(uc.aiScore ? { "aggregateRating": { "@type": "AggregateRating", "ratingValue": uc.aiScore, "bestRating": "5", "worstRating": "1", "ratingCount": "1" } } : {}),
      "keywords": uc.categories.join(", "),
      "publisher": {
        "@type": "Organization",
        "name": "Manus",
        "url": "https://manus.im"
      },
      "isPartOf": {
        "@type": "WebSite",
        "name": siteName,
        "url": origin
      }
    };
    const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

    // Strip all existing static OG / Twitter / meta description / title / canonical tags
    html = html.replace(/<meta property="og:[^"]*"[^>]*>/g, '');
    html = html.replace(/<meta name="twitter:[^"]*"[^>]*>/g, '');
    html = html.replace(/<meta name="description"[^>]*>/g, '');
    html = html.replace(/<link rel="canonical"[^>]*>/g, '');
    html = html.replace(/<title>[^<]*<\/title>/, '');

    // Insert dynamic tags and JSON-LD before </head>
    html = html.replace('</head>', `    ${ogTags}\n    ${jsonLdScript}\n  </head>`);
  } catch (e) {
    console.warn('[OG] Failed to inject meta tags:', e);
  }
  return html;
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      let page = await vite.transformIndexHtml(url, template);
      page = await injectOgMeta(page, url, req);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (_req, res) => {
    let html = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");
    html = await injectOgMeta(html, _req.originalUrl, _req);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
