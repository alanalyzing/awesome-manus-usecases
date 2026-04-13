import { decode } from "blurhash";
import { useEffect, useRef, useState, useMemo } from "react";

interface BlurhashImageProps {
  src: string;
  blurhash?: string | null;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Decodes a blurhash string into a data URL for use as a placeholder.
 * Uses a small 32x32 canvas for fast rendering.
 */
function blurhashToDataURL(hash: string, width = 32, height = 32): string {
  const pixels = decode(hash, width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

/**
 * Image component with blurhash placeholder.
 * Shows a blurred placeholder while the full image loads, then fades in.
 */
export default function BlurhashImage({
  src,
  blurhash,
  alt = "",
  className = "",
  width,
  height,
}: BlurhashImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Memoize the data URL so we don't re-decode on every render
  const placeholderUrl = useMemo(() => {
    if (!blurhash || blurhash.length < 6) return null;
    try {
      return blurhashToDataURL(blurhash);
    } catch {
      return null;
    }
  }, [blurhash]);

  // Check if image is already cached (loaded instantly)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  if (!placeholderUrl) {
    // No blurhash available — render a normal image
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Blurhash placeholder */}
      <img
        src={placeholderUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          filter: "blur(8px)",
          transform: "scale(1.1)",
          transition: "opacity 0.3s ease-out",
          opacity: loaded ? 0 : 1,
        }}
      />
      {/* Actual image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transition: "opacity 0.3s ease-out",
          opacity: loaded ? 1 : 0,
        }}
      />
    </div>
  );
}
