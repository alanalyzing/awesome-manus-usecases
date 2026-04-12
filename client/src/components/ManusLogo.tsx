/**
 * Manus brand glyph (hand icon) and logo components.
 * Uses the official Manus glyph asset from CDN.
 */

const MANUS_GLYPH_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663249428057/jnjQ5dYouig6ULcXneQuMs/manus-glyph-black_0940bf1e.png";

interface ManusGlyphProps {
  size?: number;
  className?: string;
}

export function ManusGlyph({ size = 24, className = "" }: ManusGlyphProps) {
  return (
    <img
      src={MANUS_GLYPH_URL}
      alt="Manus"
      width={size}
      height={size}
      className={`inline-block dark:invert ${className}`}
      style={{ objectFit: "contain" }}
    />
  );
}

interface ManusLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showTitle?: boolean;
}

export function ManusLogo({ size = "md", className = "", showTitle = true }: ManusLogoProps) {
  const glyphSize = size === "sm" ? 20 : size === "md" ? 28 : 36;
  const textClass =
    size === "sm"
      ? "text-base"
      : size === "md"
      ? "text-lg"
      : "text-2xl";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <ManusGlyph size={glyphSize} />
      {showTitle && (
        <span className={`font-serif font-bold tracking-tight ${textClass}`}>
          Awesome Manus Use Cases
        </span>
      )}
    </span>
  );
}

export function MadeWithManusBadge({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://manus.im"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card/50 hover:bg-card transition-colors text-xs text-muted-foreground hover:text-foreground ${className}`}
    >
      <ManusGlyph size={14} />
      <span>
        Made with <span className="font-serif font-bold">manus</span>
      </span>
    </a>
  );
}
