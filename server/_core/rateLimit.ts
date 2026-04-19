import { Request, Response, NextFunction } from "express";

/**
 * Simple in-memory rate limiter.
 * Tracks requests per IP within a sliding window.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores: Map<string, Map<string, RateLimitEntry>> = new Map();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  stores.forEach((store) => {
    store.forEach((entry, key) => {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    });
  });
}, 60_000); // every minute

export function rateLimit(opts: {
  name: string;
  windowMs: number;
  max: number;
  message?: string;
  skipLocalhost?: boolean;
}) {
  const { name, windowMs, max, message, skipLocalhost } = opts;

  return (req: Request, res: Response, next: NextFunction) => {
    const store = getStore(name);
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    // Skip rate limiting for localhost in development
    if (skipLocalhost && (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1")) {
      return next();
    }
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;

    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000).toString());
      return res.status(429).json({
        error: message || "Too many requests. Please try again later.",
      });
    }

    return next();
  };
}
