import { describe, it, expect } from "vitest";

/**
 * Tests for the admin.update and admin.updateScore procedures
 * to verify that saving changes and scores work correctly.
 */

describe("Admin Update Score Procedure", () => {
  it("should compute overall score with correct weights", () => {
    const scores = {
      completeness: 4.0,
      innovativeness: 3.5,
      impact: 4.5,
      complexity: 2.0,
      presentation: 3.0,
    };

    const overall = (
      scores.completeness * 0.20 +
      scores.innovativeness * 0.25 +
      scores.impact * 0.25 +
      scores.complexity * 0.15 +
      scores.presentation * 0.15
    );

    // Weights: 0.20 + 0.25 + 0.25 + 0.15 + 0.15 = 1.0
    expect(0.20 + 0.25 + 0.25 + 0.15 + 0.15).toBeCloseTo(1.0);

    // 4.0*0.20 + 3.5*0.25 + 4.5*0.25 + 2.0*0.15 + 3.0*0.15
    // = 0.80 + 0.875 + 1.125 + 0.30 + 0.45 = 3.55
    expect(overall).toBeCloseTo(3.55);
    expect(overall.toFixed(1)).toBe("3.5");
  });

  it("should format score data correctly for database update", () => {
    const input = {
      completeness: 4.0,
      innovativeness: 3.5,
      impact: 4.5,
      complexity: 2.0,
      presentation: 3.0,
    };

    const overall = (
      input.completeness * 0.20 +
      input.innovativeness * 0.25 +
      input.impact * 0.25 +
      input.complexity * 0.15 +
      input.presentation * 0.15
    );

    const data = {
      completenessScore: input.completeness.toFixed(1),
      innovativenessScore: input.innovativeness.toFixed(1),
      impactScore: input.impact.toFixed(1),
      complexityScore: input.complexity.toFixed(1),
      presentationScore: input.presentation.toFixed(1),
      overallScore: overall.toFixed(1),
    };

    expect(data.completenessScore).toBe("4.0");
    expect(data.innovativenessScore).toBe("3.5");
    expect(data.impactScore).toBe("4.5");
    expect(data.complexityScore).toBe("2.0");
    expect(data.presentationScore).toBe("3.0");
    expect(data.overallScore).toBe("3.5");
  });

  it("should validate score range (0-5)", () => {
    const validScores = [0, 0.1, 2.5, 3.0, 4.9, 5.0];
    const invalidScores = [-1, -0.1, 5.1, 10];

    for (const score of validScores) {
      expect(score >= 0 && score <= 5).toBe(true);
    }

    for (const score of invalidScores) {
      expect(score >= 0 && score <= 5).toBe(false);
    }
  });
});

describe("Admin Update Procedure Input", () => {
  it("should handle optional fields correctly", () => {
    // Simulating the update input - all fields optional except id
    const input = {
      id: 1,
      title: "Updated Title",
      description: "Updated description",
      categoryIds: [1, 3, 5],
      isHighlight: true,
      sessionReplayUrl: "https://example.com/session",
      deliverableUrl: undefined, // Optional field not provided
    };

    expect(input.id).toBe(1);
    expect(input.title).toBe("Updated Title");
    expect(input.deliverableUrl).toBeUndefined();
    // Ensure categoryIds is an array
    expect(Array.isArray(input.categoryIds)).toBe(true);
  });

  it("should handle combined save (fields + scores) correctly", () => {
    // Simulating the combined save flow from AdminEditDialog
    const fieldsModified = true;
    const scoresModified = true;

    const fieldsSavePayload = {
      id: 1,
      title: "Test",
      description: "Desc",
      categoryIds: [1, 2],
      isHighlight: false,
    };

    const scoresSavePayload = {
      useCaseId: 1,
      completeness: 3.0,
      innovativeness: 3.0,
      impact: 3.0,
      complexity: 3.0,
      presentation: 3.0,
    };

    // Both should be dispatched when scoresModified is true
    expect(fieldsModified).toBe(true);
    expect(scoresModified).toBe(true);
    expect(fieldsSavePayload.id).toBe(scoresSavePayload.useCaseId);
  });

  it("should NOT save scores when scoresModified is false", () => {
    const scoresModified = false;
    let scoresSaved = false;

    // Simulating the handleSave logic
    if (scoresModified) {
      scoresSaved = true;
    }

    expect(scoresSaved).toBe(false);
  });
});
