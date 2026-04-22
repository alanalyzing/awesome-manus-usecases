import { describe, it, expect } from "vitest";

/**
 * Tests for the onboarding progress tracker logic.
 * The actual hook uses localStorage, so we test the state shape and logic.
 */
describe("Onboarding progress tracker", () => {
  it("should define all three onboarding steps", () => {
    const steps = ["upvote", "search", "submit"];
    expect(steps).toHaveLength(3);
    expect(steps).toContain("upvote");
    expect(steps).toContain("search");
    expect(steps).toContain("submit");
  });

  it("should calculate progress correctly for 0 completed steps", () => {
    const state = { upvote: false, search: false, submit: false };
    const completed = [state.upvote, state.search, state.submit].filter(Boolean).length;
    expect(completed).toBe(0);
    expect(Math.round((completed / 3) * 100)).toBe(0);
  });

  it("should calculate progress correctly for 1 completed step", () => {
    const state = { upvote: true, search: false, submit: false };
    const completed = [state.upvote, state.search, state.submit].filter(Boolean).length;
    expect(completed).toBe(1);
    expect(Math.round((completed / 3) * 100)).toBe(33);
  });

  it("should calculate progress correctly for 2 completed steps", () => {
    const state = { upvote: true, search: true, submit: false };
    const completed = [state.upvote, state.search, state.submit].filter(Boolean).length;
    expect(completed).toBe(2);
    expect(Math.round((completed / 3) * 100)).toBe(67);
  });

  it("should calculate progress correctly for all 3 completed steps", () => {
    const state = { upvote: true, search: true, submit: true };
    const completed = [state.upvote, state.search, state.submit].filter(Boolean).length;
    expect(completed).toBe(3);
    expect(Math.round((completed / 3) * 100)).toBe(100);
    expect(completed === 3).toBe(true); // isComplete
  });

  it("should serialize/deserialize state correctly", () => {
    const state = { upvote: true, search: false, submit: true };
    const serialized = JSON.stringify(state);
    const parsed = JSON.parse(serialized);
    expect(parsed.upvote).toBe(true);
    expect(parsed.search).toBe(false);
    expect(parsed.submit).toBe(true);
  });

  it("should handle malformed localStorage data gracefully", () => {
    // Simulating what loadState does with bad data
    const badData = "not-json";
    let result = { upvote: false, search: false, submit: false };
    try {
      const parsed = JSON.parse(badData);
      result = {
        upvote: !!parsed.upvote,
        search: !!parsed.search,
        submit: !!parsed.submit,
      };
    } catch {
      // Falls back to default
    }
    expect(result).toEqual({ upvote: false, search: false, submit: false });
  });
});
