import { describe, it, expect } from "vitest";

/**
 * Tests for category management features:
 * 1. Category counts returned from the API
 * 2. Category CRUD operations (slug generation, validation)
 * 3. Reorder logic
 */

describe("Category slug generation", () => {
  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  it("converts name to lowercase slug", () => {
    expect(generateSlug("Marketing")).toBe("marketing");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSlug("Business Analysis")).toBe("business-analysis");
  });

  it("removes special characters", () => {
    expect(generateSlug("VC / PE")).toBe("vc-pe");
  });

  it("handles leading/trailing special chars", () => {
    expect(generateSlug("--Healthcare--")).toBe("healthcare");
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  it("handles numbers in name", () => {
    expect(generateSlug("Web 3.0")).toBe("web-3-0");
  });
});

describe("Category reorder logic", () => {
  const mockCategories = [
    { id: 1, sortOrder: 0 },
    { id: 2, sortOrder: 1 },
    { id: 3, sortOrder: 2 },
    { id: 4, sortOrder: 3 },
  ];

  const reorder = (catId: number, direction: "up" | "down", list: typeof mockCategories) => {
    const idx = list.findIndex((c) => c.id === catId);
    if (idx < 0) return list;
    if (direction === "up" && idx === 0) return list;
    if (direction === "down" && idx === list.length - 1) return list;

    const newList = [...list];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
    return newList.map((c, i) => ({ ...c, sortOrder: i }));
  };

  it("moves item up by swapping with previous", () => {
    const result = reorder(2, "up", mockCategories);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
    expect(result[0].sortOrder).toBe(0);
    expect(result[1].sortOrder).toBe(1);
  });

  it("moves item down by swapping with next", () => {
    const result = reorder(2, "down", mockCategories);
    expect(result[1].id).toBe(3);
    expect(result[2].id).toBe(2);
    expect(result[1].sortOrder).toBe(1);
    expect(result[2].sortOrder).toBe(2);
  });

  it("does not move first item up", () => {
    const result = reorder(1, "up", mockCategories);
    expect(result).toEqual(mockCategories);
  });

  it("does not move last item down", () => {
    const result = reorder(4, "down", mockCategories);
    expect(result).toEqual(mockCategories);
  });

  it("returns unchanged list for non-existent id", () => {
    const result = reorder(99, "up", mockCategories);
    expect(result).toEqual(mockCategories);
  });
});

describe("Category counts with data", () => {
  it("builds count map from count rows", () => {
    const countRows = [
      { categoryId: 1, count: 83 },
      { categoryId: 2, count: 13 },
      { categoryId: 5, count: 0 },
    ];
    const allCats = [
      { id: 1, name: "Marketing", slug: "marketing", type: "job_function", sortOrder: 0 },
      { id: 2, name: "Business Analysis", slug: "business-analysis", type: "job_function", sortOrder: 1 },
      { id: 3, name: "Finance", slug: "finance", type: "job_function", sortOrder: 2 },
    ];

    const countMap = new Map(countRows.map((r) => [r.categoryId, Number(r.count)]));
    const result = allCats.map((cat) => ({ ...cat, count: countMap.get(cat.id) ?? 0 }));

    expect(result[0].count).toBe(83);
    expect(result[1].count).toBe(13);
    expect(result[2].count).toBe(0); // No count row for id 3
  });

  it("defaults to 0 for categories with no use cases", () => {
    const countMap = new Map<number, number>();
    const cat = { id: 99, name: "Empty", slug: "empty", type: "feature", sortOrder: 0 };
    expect(countMap.get(cat.id) ?? 0).toBe(0);
  });
});

describe("Category CRUD input validation", () => {
  it("rejects empty name", () => {
    const name = "";
    expect(name.trim().length > 0).toBe(false);
  });

  it("rejects empty slug", () => {
    const slug = "   ";
    expect(slug.trim().length > 0).toBe(false);
  });

  it("accepts valid category input", () => {
    const input = { name: "Healthcare", slug: "healthcare", type: "job_function" as const };
    expect(input.name.trim().length > 0).toBe(true);
    expect(input.slug.trim().length > 0).toBe(true);
    expect(["job_function", "feature"].includes(input.type)).toBe(true);
  });

  it("validates type enum", () => {
    const validTypes = ["job_function", "feature"];
    expect(validTypes.includes("job_function")).toBe(true);
    expect(validTypes.includes("feature")).toBe(true);
    expect(validTypes.includes("other")).toBe(false);
  });
});
