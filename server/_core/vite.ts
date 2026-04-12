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
  return "https://manuslib-jnjq5dyo.manus.space";
}

/** Inject dynamic OG meta tags for /use-case/:slug pages */
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
    const image = uc.screenshots?.[0]?.url || '';
    const canonicalUrl = `${origin}/use-case/${encodeURIComponent(slug)}`;
    const siteName = "Awesome Manus Use Cases";

    const ogTags = [
      // Open Graph
      `<meta property="og:title" content="${title} — ${siteName}" />`,
      `<meta property="og:description" content="${desc}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:url" content="${canonicalUrl}" />`,
      `<meta property="og:site_name" content="${siteName}" />`,
      image ? `<meta property="og:image" content="${image}" />` : '',
      image ? `<meta property="og:image:width" content="1200" />` : '',
      image ? `<meta property="og:image:height" content="630" />` : '',
      // Twitter Card
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${desc}" />`,
      image ? `<meta name="twitter:image" content="${image}" />` : '',
      // Standard meta
      `<meta name="description" content="${desc}" />`,
      // Canonical
      `<link rel="canonical" href="${canonicalUrl}" />`,
      // Title
      `<title>${title} — ${siteName}</title>`,
    ].filter(Boolean).join('\n    ');

    // Strip all existing static OG / Twitter / meta description / title tags
    html = html.replace(/<meta property="og:[^"]*"[^>]*>/g, '');
    html = html.replace(/<meta name="twitter:[^"]*"[^>]*>/g, '');
    html = html.replace(/<meta name="description"[^>]*>/g, '');
    html = html.replace(/<title>[^<]*<\/title>/, '');

    // Insert dynamic tags before </head>
    html = html.replace('</head>', `    ${ogTags}\n  </head>`);
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
