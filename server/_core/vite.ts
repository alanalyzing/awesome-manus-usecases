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

const DEFAULT_IMAGE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663249428057/irFogdbwAhLjdhsN.png";

/** Server-side i18n for meta tags */
type LangKey = "en" | "zh" | "ja" | "ko" | "pt-BR";
const SUPPORTED_LANGS: LangKey[] = ["en", "zh", "ja", "ko", "pt-BR"];

const META_I18N: Record<LangKey, {
  siteName: string;
  defaultDesc: string;
  about: { title: string; description: string };
  leaderboard: { title: string; description: string };
  submit: { title: string; description: string };
}> = {
  en: {
    siteName: "Awesome Manus Use Cases",
    defaultDesc: "Discover, share, and celebrate awesome things built with Manus. Browse use cases by industry, feature, and more.",
    about: {
      title: "About",
      description: "Learn about the Awesome Manus Use Cases portal \u2014 a curated gallery of real-world AI automation examples built with Manus.",
    },
    leaderboard: {
      title: "Top Contributors Leaderboard",
      description: "See the top contributors to the Manus use case library. Ranked by number of published use cases and community upvotes.",
    },
    submit: {
      title: "Submit Your Use Case",
      description: "Share your Manus use case with the community. Submit your AI automation project and get featured in the gallery.",
    },
  },
  zh: {
    siteName: "Manus \u7cbe\u9009\u7528\u4f8b\u96c6",
    defaultDesc: "\u53d1\u73b0\u3001\u5206\u4eab\u548c\u5c55\u793a\u4f7f\u7528 Manus \u6784\u5efa\u7684\u7cbe\u5f69\u4f5c\u54c1\u3002\u6309\u884c\u4e1a\u3001\u529f\u80fd\u6d4f\u89c8\u7528\u4f8b\u3002",
    about: {
      title: "\u5173\u4e8e",
      description: "\u4e86\u89e3 Manus \u7cbe\u9009\u7528\u4f8b\u96c6 \u2014\u2014 \u4e00\u4e2a\u7cbe\u5fc3\u7b56\u5c55\u7684\u771f\u5b9e AI \u81ea\u52a8\u5316\u6848\u4f8b\u5e93\u3002",
    },
    leaderboard: {
      title: "\u8d21\u732e\u8005\u6392\u884c\u699c",
      description: "\u67e5\u770b Manus \u7528\u4f8b\u5e93\u7684\u9876\u7ea7\u8d21\u732e\u8005\u3002\u6309\u53d1\u5e03\u7528\u4f8b\u6570\u548c\u793e\u533a\u70b9\u8d5e\u6392\u540d\u3002",
    },
    submit: {
      title: "\u63d0\u4ea4\u4f60\u7684\u7528\u4f8b",
      description: "\u4e0e\u793e\u533a\u5206\u4eab\u4f60\u7684 Manus \u7528\u4f8b\u3002\u63d0\u4ea4\u4f60\u7684 AI \u81ea\u52a8\u5316\u9879\u76ee\uff0c\u5728\u5e93\u4e2d\u5c55\u793a\u3002",
    },
  },
  ja: {
    siteName: "Manus\u53b3\u9078\u5b9f\u7528\u4f8b\u96c6",
    defaultDesc: "Manus\u3067\u69cb\u7bc9\u3055\u308c\u305f\u512a\u308c\u305f\u4f5c\u54c1\u3092\u767a\u898b\u30fb\u5171\u6709\u30fb\u7d39\u4ecb\u3002\u696d\u754c\u3084\u6a5f\u80fd\u5225\u306b\u30e6\u30fc\u30b9\u30b1\u30fc\u30b9\u3092\u95b2\u89a7\u3002",
    about: {
      title: "\u6982\u8981",
      description: "Manus\u53b3\u9078\u5b9f\u7528\u4f8b\u96c6\u306b\u3064\u3044\u3066 \u2014 \u5b9f\u969b\u306eAI\u81ea\u52d5\u5316\u4e8b\u4f8b\u3092\u53b3\u9078\u3057\u305f\u30ae\u30e3\u30e9\u30ea\u30fc\u3002",
    },
    leaderboard: {
      title: "\u30c8\u30c3\u30d7\u8ca2\u732e\u8005\u30e9\u30f3\u30ad\u30f3\u30b0",
      description: "Manus\u30e6\u30fc\u30b9\u30b1\u30fc\u30b9\u30e9\u30a4\u30d6\u30e9\u30ea\u306e\u30c8\u30c3\u30d7\u8ca2\u732e\u8005\u3002\u516c\u958b\u6570\u3068\u30b3\u30df\u30e5\u30cb\u30c6\u30a3\u306e\u8a55\u4fa1\u3067\u30e9\u30f3\u30ad\u30f3\u30b0\u3002",
    },
    submit: {
      title: "\u30e6\u30fc\u30b9\u30b1\u30fc\u30b9\u3092\u6295\u7a3f",
      description: "\u3042\u306a\u305f\u306eManus\u30e6\u30fc\u30b9\u30b1\u30fc\u30b9\u3092\u30b3\u30df\u30e5\u30cb\u30c6\u30a3\u3068\u5171\u6709\u3002AI\u81ea\u52d5\u5316\u30d7\u30ed\u30b8\u30a7\u30af\u30c8\u3092\u6295\u7a3f\u3057\u3066\u30ae\u30e3\u30e9\u30ea\u30fc\u306b\u63b2\u8f09\u3002",
    },
  },
  ko: {
    siteName: "Manus \uc5c4\uc120 \uc0ac\uc6a9 \uc0ac\ub840\uc9d1",
    defaultDesc: "Manus\ub85c \uad6c\ucd95\ud55c \ub6f0\uc5b4\ub09c \uc791\ud488\uc744 \ubc1c\uacac\ud558\uace0 \uacf5\uc720\ud558\uc138\uc694. \uc0b0\uc5c5\ubcc4, \uae30\ub2a5\ubcc4\ub85c \uc0ac\uc6a9 \uc0ac\ub840\ub97c \ud0d0\uc0c9\ud558\uc138\uc694.",
    about: {
      title: "\uc18c\uac1c",
      description: "Manus \uc5c4\uc120 \uc0ac\uc6a9 \uc0ac\ub840\uc9d1 \uc18c\uac1c \u2014 \uc2e4\uc81c AI \uc790\ub3d9\ud654 \uc0ac\ub840\ub97c \uc5c4\uc120\ud55c \uac24\ub7ec\ub9ac.",
    },
    leaderboard: {
      title: "\ud1b1 \uae30\uc5ec\uc790 \ub9ac\ub354\ubcf4\ub4dc",
      description: "Manus \uc0ac\uc6a9 \uc0ac\ub840 \ub77c\uc774\ube0c\ub7ec\ub9ac\uc758 \ud1b1 \uae30\uc5ec\uc790. \ubc1c\ud45c \uc218\uc640 \ucee4\ubba4\ub2c8\ud2f0 \ud22c\ud45c\ub85c \ub7ad\ud0b9.",
    },
    submit: {
      title: "\uc0ac\uc6a9 \uc0ac\ub840 \uc81c\ucd9c",
      description: "\ucee4\ubba4\ub2c8\ud2f0\uc640 Manus \uc0ac\uc6a9 \uc0ac\ub840\ub97c \uacf5\uc720\ud558\uc138\uc694. AI \uc790\ub3d9\ud654 \ud504\ub85c\uc81d\ud2b8\ub97c \uc81c\ucd9c\ud558\uace0 \uac24\ub7ec\ub9ac\uc5d0 \uc18c\uac1c\ub418\uc138\uc694.",
    },
  },
  "pt-BR": {
    siteName: "Melhores Casos de Uso Manus",
    defaultDesc: "Descubra, compartilhe e celebre coisas incr\u00edveis constru\u00eddas com Manus. Navegue por casos de uso por setor e recurso.",
    about: {
      title: "Sobre",
      description: "Conhe\u00e7a o portal Melhores Casos de Uso Manus \u2014 uma galeria curada de exemplos reais de automa\u00e7\u00e3o com IA.",
    },
    leaderboard: {
      title: "Ranking de Contribuidores",
      description: "Veja os maiores contribuidores da biblioteca de casos de uso Manus. Classificados por n\u00famero de publica\u00e7\u00f5es e votos.",
    },
    submit: {
      title: "Envie Seu Caso de Uso",
      description: "Compartilhe seu caso de uso Manus com a comunidade. Envie seu projeto de automa\u00e7\u00e3o com IA e seja destaque na galeria.",
    },
  },
};

/** Resolve the language from the ?lang= query parameter */
function resolveLang(url: string): LangKey {
  const searchParams = new URLSearchParams(url.split("?")[1] || "");
  const lang = searchParams.get("lang");
  if (lang && SUPPORTED_LANGS.includes(lang as LangKey)) return lang as LangKey;
  return "en";
}

function getSiteName(lang: LangKey): string { return META_I18N[lang].siteName; }
function getDefaultDesc(lang: LangKey): string { return META_I18N[lang].defaultDesc; }

/** Get static subpage SEO definitions for a given language */
function getSubpageSeo(lang: LangKey): Record<string, { title: string; description: string }> {
  const i = META_I18N[lang];
  return {
    "/about": {
      title: `${i.about.title} — ${i.siteName}`,
      description: i.about.description,
    },
    "/leaderboard": {
      title: `${i.leaderboard.title} — ${i.siteName}`,
      description: i.leaderboard.description,
    },
    "/submit": {
      title: `${i.submit.title} — ${i.siteName}`,
      description: i.submit.description,
    },
  };
}

/** Inject dynamic OG meta tags and JSON-LD structured data for all pages */
async function injectOgMeta(html: string, url: string, req?: express.Request): Promise<string> {
  const origin = getSiteOrigin(req);
  const pathname = url.split("?")[0].split("#")[0];
  const lang = resolveLang(url);
  const SITE_NAME = getSiteName(lang);

  // ── Use case detail pages (/use-case/:slug) ──
  const ucMatch = pathname.match(/^\/use-case\/([^?#]+)/);
  if (ucMatch) {
    return injectUseCaseMeta(html, ucMatch[1], origin, SITE_NAME);
  }

  // ── Profile pages (/profile/:username) ──
  const profileMatch = pathname.match(/^\/profile\/([^?#/]+)/);
  if (profileMatch) {
    const username = decodeURIComponent(profileMatch[1]);
    return injectSubpageMeta(html, {
      title: `${username}'s Profile — ${SITE_NAME}`,
      description: `Explore use cases submitted by ${username} on ${SITE_NAME}.`,
      canonicalUrl: `${origin}/profile/${encodeURIComponent(username)}`,
      origin,
      type: "profile",
      siteName: SITE_NAME,
    });
  }

  // ── Collection pages (/collections/:slug) ──
  const colMatch = pathname.match(/^\/collections\/([^?#/]+)/);
  if (colMatch) {
    const slug = decodeURIComponent(colMatch[1]);
    const readableTitle = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return injectSubpageMeta(html, {
      title: `${readableTitle} — Collections — ${SITE_NAME}`,
      description: `Browse the "${readableTitle}" collection on ${SITE_NAME}.`,
      canonicalUrl: `${origin}/collections/${encodeURIComponent(slug)}`,
      origin,
      type: "website",
      siteName: SITE_NAME,
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
  const subpageSeo = getSubpageSeo(lang)[pathname];
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
      siteName: SITE_NAME,
      jsonLd: jsonLd,
    });
  }

  // ── Homepage with category filter ──
  const searchParams = new URLSearchParams(url.split("?")[1] || "");
  const categoryParam = searchParams.get("category");
  if (categoryParam && pathname === "/") {
    const readableCat = categoryParam.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return injectSubpageMeta(html, {
      title: `${readableCat} — ${SITE_NAME}`,
      description: `${readableCat} — ${getDefaultDesc(lang)}`,
      canonicalUrl: `${origin}/?category=${encodeURIComponent(categoryParam)}`,
      origin,
      type: "website",
      siteName: SITE_NAME,
    });
  }

  // ── Default homepage ── inject lang-aware meta for homepage
  if (pathname === "/" && lang !== "en") {
    return injectSubpageMeta(html, {
      title: SITE_NAME,
      description: getDefaultDesc(lang),
      canonicalUrl: `${origin}/?lang=${lang}`,
      origin,
      type: "website",
      siteName: SITE_NAME,
    });
  }

  return html;
}

/** Inject meta tags for use case detail pages (with full DB lookup) */
async function injectUseCaseMeta(html: string, rawSlug: string, origin: string, siteName: string = "Awesome Manus Use Cases"): Promise<string> {
  const SITE_NAME = siteName;
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
  siteName?: string;
}): string {
  const { title, description, canonicalUrl, origin, type = "website", image, jsonLd, siteName = "Awesome Manus Use Cases" } = opts;
  const SITE_NAME = siteName;
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
