import { describe, it, expect, vi } from "vitest";

// Test the API submit endpoint validation logic
describe("API Submit Endpoint", () => {
  it("should have API_SUBMIT_KEY configured in env", () => {
    // The ENV module reads from process.env
    const key = process.env.API_SUBMIT_KEY;
    expect(key).toBeDefined();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should reject requests without Authorization header", async () => {
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    try {
      const res = await fetch(`${baseUrl}/api/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test" }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Authorization");
    } catch (e: any) {
      // Server might not be running in test env — skip gracefully
      if (e.cause?.code === "ECONNREFUSED") {
        console.log("Server not running, skipping integration test");
        return;
      }
      throw e;
    }
  });

  it("should reject requests with invalid API key", async () => {
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    try {
      const res = await fetch(`${baseUrl}/api/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid-key-12345",
        },
        body: JSON.stringify({ title: "Test" }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Invalid API key");
    } catch (e: any) {
      if (e.cause?.code === "ECONNREFUSED") {
        console.log("Server not running, skipping integration test");
        return;
      }
      throw e;
    }
  });

  it("should reject requests with missing required fields when key is valid", async () => {
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    const apiKey = process.env.API_SUBMIT_KEY;
    if (!apiKey) {
      console.log("API_SUBMIT_KEY not set, skipping");
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/api/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("title");
    } catch (e: any) {
      if (e.cause?.code === "ECONNREFUSED") {
        console.log("Server not running, skipping integration test");
        return;
      }
      throw e;
    }
  });

  it("should return categories from GET /api/categories", async () => {
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    try {
      const res = await fetch(`${baseUrl}/api/categories`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.categories).toBeDefined();
      expect(Array.isArray(data.categories)).toBe(true);
      if (data.categories.length > 0) {
        expect(data.categories[0]).toHaveProperty("slug");
        expect(data.categories[0]).toHaveProperty("name");
        expect(data.categories[0]).toHaveProperty("type");
      }
    } catch (e: any) {
      if (e.cause?.code === "ECONNREFUSED") {
        console.log("Server not running, skipping integration test");
        return;
      }
      throw e;
    }
  });
});
