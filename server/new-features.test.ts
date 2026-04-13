import { describe, it, expect, vi } from "vitest";

describe("RSS Feed endpoint", () => {
  it("should return valid RSS XML with correct content type", async () => {
    const res = await fetch("http://localhost:3000/api/rss");
    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type");
    expect(contentType).toContain("application/rss+xml");
    const body = await res.text();
    expect(body).toContain("<?xml version=");
    expect(body).toContain("<rss version=\"2.0\"");
    expect(body).toContain("<channel>");
    expect(body).toContain("<title>Awesome Manus Use Cases</title>");
    expect(body).toContain("</channel>");
    expect(body).toContain("</rss>");
  });

  it("should include atom:link self-reference", async () => {
    const res = await fetch("http://localhost:3000/api/rss");
    const body = await res.text();
    expect(body).toContain("atom:link");
    expect(body).toContain("/api/rss");
  });
});

describe("Bulk import endpoint", () => {
  it("should reject requests without auth", async () => {
    const res = await fetch("http://localhost:3000/api/submit/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    expect(res.status).toBe(401);
  });

  it("should reject requests with invalid API key", async () => {
    const res = await fetch("http://localhost:3000/api/submit/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-key",
      },
      body: JSON.stringify({ items: [] }),
    });
    expect(res.status).toBe(403);
  });

  it("should reject empty items array", async () => {
    const key = process.env.API_SUBMIT_KEY;
    if (!key) return; // skip if no key
    const res = await fetch("http://localhost:3000/api/submit/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ items: [] }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("items is required");
  });

  it("should reject more than 20 items", async () => {
    const key = process.env.API_SUBMIT_KEY;
    if (!key) return;
    const items = Array.from({ length: 21 }, (_, i) => ({
      title: `Test ${i}`,
      description: `Desc ${i}`,
      categorySlugs: ["marketing"],
      screenshotUrls: ["https://example.com/img.png"],
    }));
    const res = await fetch("http://localhost:3000/api/submit/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ items }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Maximum 20");
  });
});

describe("Admin updateSummary procedure", () => {
  it("should require admin authentication", async () => {
    // Calling the tRPC procedure without auth should fail
    const res = await fetch("http://localhost:3000/api/trpc/admin.updateSummary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        json: { useCaseId: 1, summary: "Test summary" },
      }),
    });
    // tRPC returns 401 UNAUTHORIZED or 403 FORBIDDEN for unauthenticated admin calls
    expect([401, 403]).toContain(res.status);
  });
});
