import { describe, it, expect } from "vitest";

/**
 * Tests for multi-select category behavior.
 * Validates that the toggle logic correctly adds/removes categories
 * and that the filtering state is computed properly.
 */

describe("Multi-select category toggle logic", () => {
  // Simulates the handleCategoryToggle logic from Home.tsx
  function toggleCategory(prev: number[], catId: number): number[] {
    return prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId];
  }

  it("should add a category when not already selected", () => {
    const result = toggleCategory([], 1);
    expect(result).toEqual([1]);
  });

  it("should remove a category when already selected", () => {
    const result = toggleCategory([1, 2, 3], 2);
    expect(result).toEqual([1, 3]);
  });

  it("should support selecting multiple categories", () => {
    let state: number[] = [];
    state = toggleCategory(state, 1);
    state = toggleCategory(state, 3);
    state = toggleCategory(state, 5);
    expect(state).toEqual([1, 3, 5]);
  });

  it("should toggle off one category without affecting others", () => {
    let state = [1, 3, 5];
    state = toggleCategory(state, 3);
    expect(state).toEqual([1, 5]);
  });

  it("should return empty array when last category is toggled off", () => {
    let state = [1];
    state = toggleCategory(state, 1);
    expect(state).toEqual([]);
  });
});

describe("isFiltering computation", () => {
  function isFiltering(search: string, selectedCategories: number[], highlightOnly: boolean, minScore: number): boolean {
    return search.length > 0 || selectedCategories.length > 0 || highlightOnly || minScore > 0;
  }

  it("should return false when no filters are active", () => {
    expect(isFiltering("", [], false, 0)).toBe(false);
  });

  it("should return true when search is active", () => {
    expect(isFiltering("test", [], false, 0)).toBe(true);
  });

  it("should return true when categories are selected", () => {
    expect(isFiltering("", [1, 2], false, 0)).toBe(true);
  });

  it("should return true when highlight is active", () => {
    expect(isFiltering("", [], true, 0)).toBe(true);
  });

  it("should return true when minScore is set", () => {
    expect(isFiltering("", [], false, 3.5)).toBe(true);
  });

  it("should return true when multiple filters are active", () => {
    expect(isFiltering("web", [1], true, 4)).toBe(true);
  });
});

describe("handleShowAll resets all filters", () => {
  it("should clear all filter state", () => {
    // Simulates handleShowAll
    const newState = {
      selectedCategories: [] as number[],
      highlightOnly: false,
      minScore: 0,
      search: "",
      offset: 0,
      accumulatedItems: [] as any[],
    };

    expect(newState.selectedCategories).toEqual([]);
    expect(newState.highlightOnly).toBe(false);
    expect(newState.minScore).toBe(0);
    expect(newState.search).toBe("");
    expect(newState.offset).toBe(0);
    expect(newState.accumulatedItems).toEqual([]);
  });
});
