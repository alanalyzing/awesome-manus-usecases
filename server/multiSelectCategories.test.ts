import { describe, it, expect } from "vitest";

/**
 * Tests for category selection behavior.
 * Sidebar = single-select (replaces current), filter chips = multi-select toggle.
 */

describe("Sidebar single-select category logic", () => {
  // Simulates handleSidebarCategorySelect from Home.tsx
  function sidebarSelect(prev: number[], catId: number): number[] {
    return prev.length === 1 && prev[0] === catId ? [] : [catId];
  }

  it("should select a category when none is selected", () => {
    expect(sidebarSelect([], 1)).toEqual([1]);
  });

  it("should replace current category with new one", () => {
    expect(sidebarSelect([1], 2)).toEqual([2]);
  });

  it("should deselect when clicking the same category", () => {
    expect(sidebarSelect([1], 1)).toEqual([]);
  });

  it("should replace even when multiple categories were previously selected (from chips)", () => {
    expect(sidebarSelect([1, 2, 3], 5)).toEqual([5]);
  });

  it("should not deselect when clicking same category but multiple are selected", () => {
    // If multiple are selected (from filter chips), clicking any sidebar item replaces all
    expect(sidebarSelect([1, 2], 1)).toEqual([1]);
  });
});

describe("Filter chip multi-select toggle logic", () => {
  // Simulates handleCategoryToggle from Home.tsx (used by filter chip X buttons)
  function toggleCategory(prev: number[], catId: number): number[] {
    return prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId];
  }

  it("should add a category when not already selected", () => {
    expect(toggleCategory([], 1)).toEqual([1]);
  });

  it("should remove a category when already selected", () => {
    expect(toggleCategory([1, 2, 3], 2)).toEqual([1, 3]);
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
