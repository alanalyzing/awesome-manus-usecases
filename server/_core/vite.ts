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

const SITE_NAME = "Awesome Manus Use Cases";
const DEFAULT_DESC = "Discover, share, and celebrate awesome things built with Manus. Browse use cases by industry, feature, and more.";
const DEFAULT_IMAGE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663249428057/irFogdbwAhLjdhsN.png";

/** Static subpage SEO definitions */
const SUBPAGE_SEO: Record<string, { title: string; description: string; priority?: string }> = {
  "/about": {
    title: `About — ${SITE_NAME}`,
    description: "Learn about the Awesome Manus Use Cases portal — a curated gallery of real-world AI automation examples built with Manus. Discover how teams across industries leverage AI agents.",
  },
  "/leaderboard": {
    title: `Top Contributors Leaderboard — ${SITE_NAME}`,
    description: "See the top contributors to the Manus use case library. Ranked by number of published use cases and community upvotes. Join the community and share your own AI automation stories.",
  },
  "/submit": {
    title: `Submit Your Use Case — ${SITE_NAME}`,
    description: "Share your Manus use case with the community. Submit your AI automation project, get featured in the gallery, and inspire others with what you've built using Manus.",
  },
};

/** Inject dynamic OG meta tags and JSON-LD structured data for all pages */
async function injectOgMeta(html: string, url: string, req?: express.Request): Promise<string> {
  const origin = getSiteOrigin(req);
  const pathname = url.split("?")[0].split("#")[0];

  // ── Use case detail pages (/use-case/:slug) ──
  const ucMatch = pathname.match(/^\/use-case\/([^?#]+)/);
  if (ucMatch) {
    return injectUseCaseMeta(html, ucMatch[1], origin);
  }

  // ── Profile pages (/profile/:username) ──
  const profileMatch = pathname.match(/^\/profile\/([^?#/]+)/);
  if (profileMatch) {
    const username = decodeURIComponent(profileMatch[1]);
    return injectSubpageMeta(html, {
      title: `${username}'s Profile — ${SITE_NAME}`,
      description: `Explore use cases submitted by ${username} on the Awesome Manus Use Cases portal. See their AI automation projects, community contributions, and expertise.`,
      canonicalUrl: `${origin}/profile/${encodeURIComponent(username)}`,
      origin,
      type: "profile",
    });
  }

  // ── Collection pages (/collections/:slug) ──
  const colMatch = pathname.match(/^\/collections\/([^?#/]+)/);
  if (colMatch) {
    const slug = decodeURIComponent(colMatch[1]);
    const readableTitle = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return injectSubpageMeta(html, {
      title: `${readableTitle} — Collections — ${SITE_NAME}`,
      description: `Browse the "${readableTitle}" collection on Awesome Manus Use Cases. A curated set of AI automation examples and real-world projects built with Manus.`,
      canonicalUrl: `${origin}/collections/${encodeURIComponent(slug)}`,
      origin,
      type: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": readableTitle,
        "url": `${origin}/collections/${encodeURIComponent(slug)}`,
        "isPartOf": { "@type": "WebSite", "name": SITE_NAME, "url": origin },
      },
    });
  }

  // ── Static subpages (about, leaderboard, submit) ──
  const subpageSeo = SUBPAGE_SEO[pathname];
  if (subpageSeo) {
    const jsonLd: Record<string, any> | undefined = pathname === "/about" ? {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": subpageSeo.title,
      "description": subpageSeo.description,
      "url": `${origin}${pathname}`,
      "mainEntity": {
        "@type": "Organization",
        "name": "Manus",
        "url": "https://manus.im",
        "description": "Manus is an AI agent platform that helps teams automate complex workflows across industries.",
      },
      "isPartOf": { "@type": "WebSite", "name": SITE_NAME, "url": origin },
    } : pathname === "/leaderboard" ? {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Top Contributors",
      "description": subpageSeo.description,
      "url": `${origin}${pathname}`,
      "isPartOf": { "@type": "WebSite", "name": SITE_NAME, "url": origin },
    } : undefined;

    return injectSubpageMeta(html, {
      title: subpageSeo.title,
      description: subpageSeo.description,
      canonicalUrl: `${origin}${pathname}`,
      origin,
      type: "website",
      jsonLd: jsonLd,
    });
  }

  // ── Homepage with category filter ──
  const searchParams = new URLSearchParams(url.split("?")[1] || "");
  const categoryParam = searchParams.get("category");
  if (categoryParam && pathname === "/") {
    const readableCat = categoryParam.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return injectSubpageMeta(html, {
      title: `${readableCat} Use Cases — ${SITE_NAME}`,
      description: `Browse ${readableCat.toLowerCase()} use cases built with Manus. Discover real-world AI automation examples in ${readableCat.toLowerCase()}.`,
      canonicalUrl: `${origin}/?category=${encodeURIComponent(categoryParam)}`,
      origin,
      type: "website",
    });
  }

  return html;
}

/** Inject meta tags for use case detail pages (with full DB lookup) */
async function injectUseCaseMeta(html: string, rawSlug: string, origin: string): Promise<string> {
  try {
    const slug = decodeURIComponent(rawSlug);
    const uc = await getUseCaseMetaBySlug(slug);
    if (!uc) return html;

    const title = uc.title.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const rawDesc = (uc.description || '').replace(/\n/g, ' ').substring(0, 200);
    const desc = rawDesc.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const screenshot = uc.screenshots?.[0]?.url || '';
    const canonicalUrl = `${origin}/use-case/${encodeURIComponent(slug)}`;

    // Use the same global OG image across all pages
    const image = DEFAULT_IMAGE;

    const ogTags = [
      `<meta property="og:title" content="${title} \u2014 ${SITE_NAME}" />`,
      `<meta property="og:description" content="${desc}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:url" content="${canonicalUrl}" />`,
      `<meta property="og:site_name" content="${SITE_NAME}" />`,
      `<meta property="og:image" content="${image}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${desc}" />`,
      `<meta name="twitter:image" content="${image}" />`,
      `<meta name="twitter:site" content="@manus_im" />`,
      `<meta name="description" content="${desc}" />`,
      `<link rel="canonical" href="${canonicalUrl}" />`,
      `<title>${title} \u2014 ${SITE_NAME}</title>`,
    ].join('\n    ');

    // JSON-LD structured data
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
        "name": SITE_NAME,
        "url": origin
      }
    };

    html = stripExistingMeta(html);
    html = html.replace('</head>', `    ${ogTags}\n    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`);
  } catch (e) {
    console.warn('[OG] Failed to inject use case meta tags:', e);
  }
  return html;
}

/** Inject meta tags for generic subpages */
function injectSubpageMeta(html: string, opts: {
  title: string;
  description: string;
  canonicalUrl: string;
  origin: string;
  type?: string;
  image?: string;
  jsonLd?: Record<string, any>;
}): string {
  const { title, description, canonicalUrl, origin, type = "website", image, jsonLd } = opts;
  const safeTitle = title.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeDesc = description.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const ogImage = image || DEFAULT_IMAGE;

  const ogTags = [
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:description" content="${safeDesc}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDesc}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
    `<meta name="twitter:site" content="@manus_im" />`,
    `<meta name="description" content="${safeDesc}" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<title>${safeTitle}</title>`,
  ].join('\n    ');

  html = stripExistingMeta(html);
  let injection = `    ${ogTags}`;
  if (jsonLd) {
    injection += `\n    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
  }
  html = html.replace('</head>', `${injection}\n  </head>`);
  return html;
}

/** Strip all existing OG / Twitter / meta description / title / canonical tags to prevent duplicates */
function stripExistingMeta(html: string): string {
  html = html.replace(/<meta property="og:[^"]*"[^>]*>/g, '');
  html = html.replace(/<meta name="twitter:[^"]*"[^>]*>/g, '');
  html = html.replace(/<meta name="description"[^>]*>/g, '');
  html = html.replace(/<link rel="canonical"[^>]*>/g, '');
  html = html.replace(/<title>[^<]*<\/title>/, '');
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
