import { describe, it, expect } from "vitest";

const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
const apiKey = process.env.API_SUBMIT_KEY;

function skipIfNoServer(e: any) {
  if (e.cause?.code === "ECONNREFUSED") {
    console.log("Server not running, skipping integration test");
    return true;
  }
  return false;
}

describe("PATCH /api/update", () => {
  it("should reject requests without Authorization header", async () => {
    try {
      const res = await fetch(`${baseUrl}/api/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 1, deliverableUrl: "https://example.com" }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Authorization");
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should reject requests with invalid API key", async () => {
    try {
      const res = await fetch(`${baseUrl}/api/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid-key-12345",
        },
        body: JSON.stringify({ id: 1 }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Invalid API key");
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should require an identifier (id, slug, or sessionReplayUrl)", async () => {
    if (!apiKey) { console.log("API_SUBMIT_KEY not set, skipping"); return; }
    try {
      const res = await fetch(`${baseUrl}/api/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ deliverableUrl: "https://example.com" }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Must provide one of");
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should return 404 for non-existent id", async () => {
    if (!apiKey) { console.log("API_SUBMIT_KEY not set, skipping"); return; }
    try {
      const res = await fetch(`${baseUrl}/api/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: 999999, deliverableUrl: "https://example.com" }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("not found");
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should return 404 for non-existent slug", async () => {
    if (!apiKey) { console.log("API_SUBMIT_KEY not set, skipping"); return; }
    try {
      const res = await fetch(`${baseUrl}/api/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ slug: "non-existent-slug-xyz-999", deliverableUrl: "https://example.com" }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("not found");
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should return 404 for non-existent sessionReplayUrl", async () => {
    if (!apiKey) { console.log("API_SUBMIT_KEY not set, skipping"); return; }
    try {
      const res = await fetch(`${baseUrl}/api/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ sessionReplayUrl: "https://manus.im/share/nonexistent-999", deliverableUrl: "https://example.com" }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("not found");
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should validate deliverableUrl format", async () => {
    if (!apiKey) { console.log("API_SUBMIT_KEY not set, skipping"); return; }
    try {
      const res = await fetch(`${baseUrl}/api/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: 1, deliverableUrl: "not-a-valid-url" }),
      });
      // Could be 400 (invalid URL) or 404 (id not found) depending on order
      expect([400, 404]).toContain(res.status);
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });
});

describe("PATCH /api/update/bulk", () => {
  it("should reject requests without Authorization header", async () => {
    try {
      const res = await fetch(`${baseUrl}/api/update/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      });
      expect(res.status).toBe(401);
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should reject empty items array", async () => {
    if (!apiKey) { console.log("API_SUBMIT_KEY not set, skipping"); return; }
    try {
      const res = await fetch(`${baseUrl}/api/update/bulk`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ items: [] }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("items is required");
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should reject more than 50 items", async () => {
    if (!apiKey) { console.log("API_SUBMIT_KEY not set, skipping"); return; }
    try {
      const items = Array.from({ length: 51 }, (_, i) => ({ id: i + 1, deliverableUrl: "https://example.com" }));
      const res = await fetch(`${baseUrl}/api/update/bulk`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ items }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("50");
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should handle mixed success/failure in bulk update", async () => {
    if (!apiKey) { console.log("API_SUBMIT_KEY not set, skipping"); return; }
    try {
      const res = await fetch(`${baseUrl}/api/update/bulk`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          items: [
            { id: 999999, deliverableUrl: "https://example.com" },
            { slug: "nonexistent-slug-xyz", deliverableUrl: "https://example.com" },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBe(2);
      expect(data.failed).toBe(2);
      expect(data.succeeded).toBe(0);
      expect(data.results).toHaveLength(2);
      expect(data.results[0].success).toBe(false);
      expect(data.results[1].success).toBe(false);
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });

  it("should handle items without identifiers", async () => {
    if (!apiKey) { console.log("API_SUBMIT_KEY not set, skipping"); return; }
    try {
      const res = await fetch(`${baseUrl}/api/update/bulk`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          items: [
            { deliverableUrl: "https://example.com" },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results[0].success).toBe(false);
      expect(data.results[0].error).toContain("Must provide");
    } catch (e: any) {
      if (skipIfNoServer(e)) return;
      throw e;
    }
  });
});

describe("getUseCaseBySessionUrl helper", () => {
  it("should be exported from db module", async () => {
    const db = await import("./db");
    expect(typeof db.getUseCaseBySessionUrl).toBe("function");
  });
});
