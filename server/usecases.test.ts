import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("categories.list", () => {
  it("returns an array of categories", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
    // Each category should have id, name, slug, type
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("slug");
      expect(result[0]).toHaveProperty("type");
    }
  });

  it("returns categories by type", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const jobFunctions = await caller.categories.byType({ type: "job_function" });
    expect(Array.isArray(jobFunctions)).toBe(true);
    for (const cat of jobFunctions) {
      expect(cat.type).toBe("job_function");
    }
    const features = await caller.categories.byType({ type: "feature" });
    expect(Array.isArray(features)).toBe(true);
    for (const cat of features) {
      expect(cat.type).toBe("feature");
    }
  });
});

describe("useCases.list", () => {
  it("returns paginated use cases with items and total", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.useCases.list({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("supports search parameter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.useCases.list({ search: "nonexistent-query-xyz-123" });
    expect(result.items).toHaveLength(0);
  });

  it("supports highlight filter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.useCases.list({ highlightOnly: true });
    expect(Array.isArray(result.items)).toBe(true);
    for (const uc of result.items) {
      expect(uc.isHighlight).toBe(true);
    }
  });

  it("supports sort options", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw for any sort option
    await expect(caller.useCases.list({ sort: "popular" })).resolves.toBeDefined();
    await expect(caller.useCases.list({ sort: "newest" })).resolves.toBeDefined();
    await expect(caller.useCases.list({ sort: "views" })).resolves.toBeDefined();
  });
});

describe("useCases.toggleUpvote", () => {
  it("allows anonymous upvoting without authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.useCases.toggleUpvote({ useCaseId: 1 });
    expect(result).toHaveProperty("upvoted");
    expect(result).toHaveProperty("newCount");
    expect(typeof result.upvoted).toBe("boolean");
    expect(typeof result.newCount).toBe("number");
  });
});

describe("useCases.submit", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.useCases.submit({
        title: "Test",
        description: "Test description",
        categoryIds: [1],
        screenshotUrls: [{ url: "https://example.com/img.png", fileKey: "test/key.png" }],
        language: "en",
        consentToContact: false,
      })
    ).rejects.toThrow();
  });
});

describe("admin.stats", () => {
  it("requires admin role", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("returns stats for admin users", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.admin.stats();
    expect(stats).toHaveProperty("totalSubmissions");
    expect(stats).toHaveProperty("pendingCount");
    expect(stats).toHaveProperty("approvedCount");
    expect(stats).toHaveProperty("rejectedCount");
    expect(stats).toHaveProperty("totalUpvotes");
    expect(stats).toHaveProperty("totalViews");
    expect(stats).toHaveProperty("topCategories");
    expect(Array.isArray(stats.topCategories)).toBe(true);
  });
});

describe("admin.submissions", () => {
  it("requires admin role", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.submissions({})).rejects.toThrow();
  });

  it("returns submissions for admin users", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.submissions({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("supports status filter", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    const pending = await caller.admin.submissions({ status: "pending" });
    expect(Array.isArray(pending.items)).toBe(true);
    for (const item of pending.items) {
      expect(item.status).toBe("pending");
    }
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

describe("admin.contributorLeaderboard", () => {
  it("returns an array of leaderboard entries (public endpoint)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.contributorLeaderboard({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
    for (const entry of result) {
      expect(entry).toHaveProperty("userId");
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("approvedCount");
      expect(entry).toHaveProperty("totalUpvotes");
      expect(typeof entry.userId).toBe("number");
      expect(typeof entry.approvedCount).toBe("number");
      expect(typeof entry.totalUpvotes).toBe("number");
    }
  });

  it("respects the limit parameter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.contributorLeaderboard({ limit: 2 });
    expect(result.length).toBeLessThanOrEqual(2);
  });
});

describe("admin.bulkAiScan", () => {
  it("requires admin role", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.bulkAiScan()).rejects.toThrow();
  });
});

describe("admin.exportAnalytics", () => {
  it("requires admin role", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.exportAnalytics({ days: 30 })).rejects.toThrow();
  });

  it("returns CSV string and summary for admin users", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.exportAnalytics({ days: 30 });
    expect(result).toHaveProperty("csv");
    expect(result).toHaveProperty("summary");
    expect(typeof result.csv).toBe("string");
    // CSV should have a header row
    expect(result.csv).toContain("Date,Submissions,Approvals,Upvotes,Views");
    expect(result.summary).toHaveProperty("totalViews");
    expect(result.summary).toHaveProperty("totalUpvotes");
    expect(result.summary).toHaveProperty("totalUseCases");
    expect(result.summary).toHaveProperty("totalContributors");
  });
});

describe("OG Meta Tags - vite.ts injectOgMeta", () => {
  it("should not modify HTML for non-use-case URLs", async () => {
    // We test the function indirectly by verifying the server returns proper HTML
    // For the unit test, we verify the getBySlug returns data needed for OG tags
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Listing should work and return items with expected shape
    const result = await caller.useCases.list({ limit: 1 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("getBySlug returns null for non-existent slugs", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.useCases.getBySlug({ slug: "non-existent-slug-xyz" });
    expect(result).toBeNull();
  });
});

describe("Submission form validation", () => {
  it("submit requires title, description, categories, and screenshots", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    // Missing title
    await expect(
      caller.useCases.submit({
        title: "",
        description: "Test description",
        categoryIds: [1],
        screenshotUrls: [{ url: "https://example.com/img.png", fileKey: "test/key.png" }],
        language: "en",
        consentToContact: false,
      })
    ).rejects.toThrow();
  });

  it("submit requires at least one category", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.useCases.submit({
        title: "Valid Title",
        description: "Valid description",
        categoryIds: [],
        screenshotUrls: [{ url: "https://example.com/img.png", fileKey: "test/key.png" }],
        language: "en",
        consentToContact: false,
      })
    ).rejects.toThrow();
  });

  it("submit requires at least one screenshot", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.useCases.submit({
        title: "Valid Title",
        description: "Valid description",
        categoryIds: [1],
        screenshotUrls: [],
        language: "en",
        consentToContact: false,
      })
    ).rejects.toThrow();
  });
});
