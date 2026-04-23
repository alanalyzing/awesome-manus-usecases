import { Router, Request, Response } from "express";
import { Resvg } from "@resvg/resvg-js";
import { getUseCaseMetaBySlug } from "./db";

const ogImageRouter = Router();

/** Truncate text to fit within a max character count, adding ellipsis */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1).trim() + "…";
}

/** Escape XML special characters */
function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Word-wrap text into lines that fit within a max character width */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Limit to 3 lines max, truncate last line if needed
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = truncate(lines[2], maxCharsPerLine);
  }

  return lines;
}

/** Generate SVG for the OG image */
function generateOgSvg(params: {
  title: string;
  categories: string[];
  aiScore: string | null;
  submitterName: string | null;
}): string {
  const { title, categories, aiScore, submitterName } = params;

  // Word-wrap the title (approx 38 chars per line at font-size 48)
  const titleLines = wrapText(title, 38);
  const titleY = titleLines.length === 1 ? 290 : titleLines.length === 2 ? 260 : 240;
  const titleSvg = titleLines
    .map((line, i) => `<text x="80" y="${titleY + i * 60}" font-family="Georgia, 'Times New Roman', serif" font-size="48" font-weight="bold" fill="#1a1a1a">${escXml(line)}</text>`)
    .join("\n    ");

  // Category badges (max 3)
  const displayCats = categories.slice(0, 3);
  let catX = 80;
  const catBadges = displayCats.map((cat) => {
    const textLen = cat.length * 9 + 24;
    const badge = `<rect x="${catX}" y="420" rx="14" ry="14" width="${textLen}" height="28" fill="#f3f0eb" />
    <text x="${catX + 12}" y="439" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#6b5e4f" font-weight="500">${escXml(cat)}</text>`;
    catX += textLen + 10;
    return badge;
  }).join("\n    ");

  // Score badge
  const scoreBadge = aiScore ? `
    <rect x="80" y="480" rx="16" ry="16" width="90" height="32" fill="#fef3c7" />
    <text x="100" y="501" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#b45309" font-weight="600">★ ${aiScore}</text>` : "";

  // Submitter
  const submitterSvg = submitterName ? `
    <text x="${aiScore ? "190" : "80"}" y="501" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#888">by ${escXml(truncate(submitterName, 30))}</text>` : "";

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#faf9f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f0ede8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#c9a96e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b7355;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1200" height="6" fill="url(#accent)" />

  <!-- Decorative corner pattern -->
  <circle cx="1120" cy="80" r="120" fill="#c9a96e" opacity="0.06" />
  <circle cx="1140" cy="60" r="80" fill="#c9a96e" opacity="0.04" />

  <!-- Manus branding -->
  <text x="80" y="100" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="#c9a96e" font-weight="bold" letter-spacing="2">MANUS</text>
  <text x="80" y="130" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#999" letter-spacing="1">USE CASE LIBRARY</text>

  <!-- Divider -->
  <rect x="80" y="160" width="100" height="2" fill="#c9a96e" opacity="0.5" />

  <!-- Title -->
  ${titleSvg}

  <!-- Categories -->
  ${catBadges}

  <!-- Score & Submitter -->
  ${scoreBadge}
  ${submitterSvg}

  <!-- Bottom bar -->
  <rect x="0" y="590" width="1200" height="40" fill="#1a1a1a" />
  <text x="80" y="616" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#999">awesome.manus.space</text>
  <text x="1120" y="616" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#999" text-anchor="end">Awesome Manus Use Cases</text>
</svg>`;
}

/**
 * GET /api/og-image/:slug
 *
 * Generates a branded Open Graph preview image (1200x630 PNG) for a use case.
 * Cached for 24 hours.
 */
ogImageRouter.get("/og-image/:slug", async (req: Request, res: Response) => {
  try {
    const slug = decodeURIComponent(req.params.slug);
    const uc = await getUseCaseMetaBySlug(slug);

    if (!uc) {
      return res.status(404).send("Use case not found");
    }

    const svg = generateOgSvg({
      title: uc.title,
      categories: uc.categories,
      aiScore: uc.aiScore,
      submitterName: uc.submitterName,
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400"); // Cache 24h
    res.set("Content-Length", String(pngBuffer.length));
    return res.send(Buffer.from(pngBuffer));
  } catch (error: any) {
    console.error("[OG Image] Error:", error);
    return res.status(500).send("Failed to generate image");
  }
});

export { ogImageRouter };
