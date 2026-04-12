/**
 * Manus brand glyph (hand icon) and logo components.
 * Based on the official Manus brand assets.
 */

interface ManusGlyphProps {
  size?: number;
  className?: string;
}

export function ManusGlyph({ size = 24, className = "" }: ManusGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Stylized hand glyph with 3 rays */}
      <g fill="currentColor">
        {/* Three finger rays */}
        <ellipse cx="38" cy="12" rx="4" ry="10" transform="rotate(-15 38 12)" />
        <ellipse cx="50" cy="8" rx="4" ry="11" />
        <ellipse cx="62" cy="12" rx="4" ry="10" transform="rotate(15 62 12)" />
        {/* Hand body - rounded shape */}
        <path d="M30 30 C20 30, 14 40, 16 52 C18 64, 28 72, 38 76 C42 78, 44 82, 42 88 C40 94, 44 98, 50 96 C56 94, 58 88, 56 82 C54 76, 58 70, 64 68 C74 64, 82 54, 82 44 C82 34, 74 28, 64 28 C58 28, 52 30, 50 34 C48 30, 42 28, 36 28 C34 28, 32 29, 30 30 Z" />
        {/* Inner spiral/curl */}
        <circle cx="44" cy="52" r="8" fill="var(--background, white)" />
        <path d="M44 44 C50 44, 52 48, 52 52 C52 56, 50 60, 44 60 C40 60, 38 58, 38 55 C38 52, 40 50, 44 50" stroke="var(--background, white)" strokeWidth="3" fill="none" />
      </g>
    </svg>
  );
}

interface ManusLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ManusLogo({ size = "md", className = "" }: ManusLogoProps) {
  const glyphSize = size === "sm" ? 20 : size === "md" ? 24 : 32;
  const textClass =
    size === "sm"
      ? "text-base"
      : size === "md"
      ? "text-lg"
      : "text-2xl";

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <ManusGlyph size={glyphSize} />
      <span className={`font-serif font-bold tracking-tight ${textClass}`}>manus</span>
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
