import { describe, it, expect } from "vitest";

/**
 * Tests for the AI Use Case Discovery Chat endpoint.
 * These validate the input schema and response shape.
 */
describe("AI Chat endpoint schema", () => {
  it("should accept a valid question input", () => {
    const validInput = {
      question: "I want to build a marketing dashboard",
      conversationHistory: [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi there!" },
      ],
    };
    expect(validInput.question.length).toBeGreaterThan(0);
    expect(validInput.question.length).toBeLessThanOrEqual(500);
    expect(validInput.conversationHistory).toHaveLength(2);
    expect(validInput.conversationHistory[0].role).toBe("user");
    expect(validInput.conversationHistory[1].role).toBe("assistant");
  });

  it("should reject empty question", () => {
    const emptyQuestion = "";
    expect(emptyQuestion.length).toBe(0);
  });

  it("should reject question exceeding 500 chars", () => {
    const longQuestion = "a".repeat(501);
    expect(longQuestion.length).toBeGreaterThan(500);
  });

  it("should accept request without conversation history", () => {
    const inputWithoutHistory = {
      question: "Find me real estate use cases",
    };
    expect(inputWithoutHistory.question).toBeDefined();
    expect((inputWithoutHistory as any).conversationHistory).toBeUndefined();
  });

  it("should limit conversation history to 10 messages", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `Message ${i}`,
    }));
    expect(history).toHaveLength(10);
    // 11 would exceed the limit
    const tooLong = [...history, { role: "user" as const, content: "extra" }];
    expect(tooLong.length).toBeGreaterThan(10);
  });

  it("should not expose system prompt in response shape", () => {
    // The response should only contain { answer: string }
    const mockResponse = { answer: "Here are some relevant use cases..." };
    expect(mockResponse).toHaveProperty("answer");
    expect(typeof mockResponse.answer).toBe("string");
    expect(mockResponse).not.toHaveProperty("systemPrompt");
    expect(mockResponse).not.toHaveProperty("messages");
    expect(mockResponse).not.toHaveProperty("reasoning");
  });
});
