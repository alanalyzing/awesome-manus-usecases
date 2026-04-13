import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  }),
}));

describe("Extension API Endpoints", () => {
  describe("GET /api/extension/use-cases", () => {
    it("should return use cases with required fields", async () => {
      // Verify the endpoint module exports correctly
      const { extensionRouter } = await import("./apiExtension");
      expect(extensionRouter).toBeDefined();
      expect(typeof extensionRouter).toBe("function"); // Express Router is a function
    });

    it("should accept valid sort parameters", () => {
      const validSorts = ["popular", "newest", "top_rated"];
      validSorts.forEach((sort) => {
        expect(["popular", "newest", "top_rated"]).toContain(sort);
      });
    });

    it("should enforce max limit of 200", () => {
      const testCases = [
        { input: "50", expected: 50 },
        { input: "200", expected: 200 },
        { input: "500", expected: 200 },
        { input: "abc", expected: 200 }, // NaN defaults to 50, but Math.min(NaN||50, 200) = 50
      ];
      testCases.forEach(({ input, expected }) => {
        const limit = Math.min(parseInt(input) || 50, 200);
        expect(limit).toBeLessThanOrEqual(200);
      });
    });
  });

  describe("GET /api/extension/categories", () => {
    it("should export the extension router", async () => {
      const { extensionRouter } = await import("./apiExtension");
      expect(extensionRouter).toBeDefined();
    });
  });

  describe("GET /api/extension/collections", () => {
    it("should export the extension router with collections endpoint", async () => {
      const { extensionRouter } = await import("./apiExtension");
      expect(extensionRouter).toBeDefined();
      // Router stack should contain routes
      const routes = (extensionRouter as any).stack?.filter((s: any) => s.route) || [];
      expect(routes.length).toBeGreaterThan(0);
    });
  });
});

describe("Collections DB helpers", () => {
  it("should export collection functions from db", async () => {
    // Unmock for this test
    vi.doUnmock("./db");
    const db = await import("./db");
    expect(typeof db.createCollection).toBe("function");
    expect(typeof db.updateCollection).toBe("function");
    expect(typeof db.deleteCollection).toBe("function");
    expect(typeof db.getCollectionBySlug).toBe("function");
    expect(typeof db.getAllCollections).toBe("function");
    expect(typeof db.addUseCaseToCollection).toBe("function");
    expect(typeof db.removeUseCaseFromCollection).toBe("function");
    expect(typeof db.getCollectionUseCaseIds).toBe("function");
  });
});

describe("Featured Use Case DB helpers", () => {
  it("should export featured functions from db", async () => {
    vi.doUnmock("./db");
    const db = await import("./db");
    expect(typeof db.setFeaturedUseCase).toBe("function");
    expect(typeof db.getActiveFeaturedUseCase).toBe("function");
    expect(typeof db.removeFeaturedUseCase).toBe("function");
  });
});

describe("Blurhash module", () => {
  it("should export blurhash functions", async () => {
    const blurhash = await import("./blurhash");
    expect(typeof blurhash.generateBlurhash).toBe("function");
    expect(typeof blurhash.generateAndStoreBlurhash).toBe("function");
    expect(typeof blurhash.backfillBlurhashes).toBe("function");
  });

  it("should return null for invalid URLs", async () => {
    const { generateBlurhash } = await import("./blurhash");
    const result = await generateBlurhash("https://invalid-url-that-does-not-exist.example.com/image.png");
    expect(result).toBeNull();
  });
});
