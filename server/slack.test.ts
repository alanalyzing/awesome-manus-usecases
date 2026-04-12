import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the helper functions by mocking fetch and ENV
describe("Slack webhook integration", () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("notifySlackNewSubmission", () => {
    it("should return false when SLACK_WEBHOOK_URL is not set", async () => {
      // Temporarily unset the env so the helper sees no webhook
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      delete process.env.SLACK_WEBHOOK_URL;

      vi.resetModules();
      const { notifySlackNewSubmission } = await import("./slack");
      const result = await notifySlackNewSubmission({
        title: "Test Use Case",
        description: "A test description",
        submitterName: "John",
        submitterEmail: "john@example.com",
        language: "en",
        categoryNames: ["Marketing"],
        screenshotCount: 2,
      });
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();

      // Restore
      if (originalEnv !== undefined) process.env.SLACK_WEBHOOK_URL = originalEnv;
    });

    it("should send a POST request with Block Kit payload when webhook is configured", async () => {
      // Dynamically set the env
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";

      // Re-import to pick up new env
      vi.resetModules();
      const { notifySlackNewSubmission } = await import("./slack");

      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "ok" } as Response);

      const result = await notifySlackNewSubmission({
        title: "My Amazing Use Case",
        description: "Built a full marketing campaign with Manus",
        submitterName: "Alice",
        submitterEmail: "alice@example.com",
        language: "en",
        categoryNames: ["Marketing", "Advertising"],
        sessionReplayUrl: "https://manus.im/replay/123",
        deliverableUrl: "https://example.com/result",
        screenshotCount: 3,
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://hooks.slack.com/services/test");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(options.body);
      expect(body.text).toContain("My Amazing Use Case");
      expect(body.blocks).toBeDefined();
      expect(body.blocks.length).toBeGreaterThan(0);

      // Should have header block
      const headerBlock = body.blocks.find((b: any) => b.type === "header");
      expect(headerBlock).toBeDefined();
      expect(headerBlock.text.text).toContain("New Use Case Submission");

      // Should have fields block with submitter info
      const fieldsBlock = body.blocks.find((b: any) => b.type === "section" && b.fields);
      expect(fieldsBlock).toBeDefined();

      // Should have action buttons for session replay and deliverable
      const actionsBlock = body.blocks.find((b: any) => b.type === "actions");
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock.elements.length).toBe(2);

      process.env.SLACK_WEBHOOK_URL = originalEnv || "";
    });

    it("should return false when fetch fails", async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";

      vi.resetModules();
      const { notifySlackNewSubmission } = await import("./slack");

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await notifySlackNewSubmission({
        title: "Test",
        description: "Test",
        submitterName: "Test",
        submitterEmail: "test@test.com",
        language: "en",
        categoryNames: [],
        screenshotCount: 1,
      });

      expect(result).toBe(false);

      process.env.SLACK_WEBHOOK_URL = originalEnv || "";
    });

    it("should truncate long descriptions to 300 characters", async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";

      vi.resetModules();
      const { notifySlackNewSubmission } = await import("./slack");

      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "ok" } as Response);

      const longDesc = "A".repeat(500);
      await notifySlackNewSubmission({
        title: "Test",
        description: longDesc,
        submitterName: "Test",
        submitterEmail: "test@test.com",
        language: "en",
        categoryNames: [],
        screenshotCount: 1,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const descBlock = body.blocks.find(
        (b: any) => b.type === "section" && b.text && !b.fields && !b.text.text.includes("*")
      );
      // The description should be truncated
      expect(descBlock.text.text.length).toBeLessThanOrEqual(303); // 297 + "..."

      process.env.SLACK_WEBHOOK_URL = originalEnv || "";
    });
  });

  describe("notifySlackStatusChange", () => {
    it("should send approved notification with correct emoji", async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";

      vi.resetModules();
      const { notifySlackStatusChange } = await import("./slack");

      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "ok" } as Response);

      const result = await notifySlackStatusChange({
        title: "Great Use Case",
        status: "approved",
        adminName: "Admin Bob",
      });

      expect(result).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain("Approved");
      const headerBlock = body.blocks.find((b: any) => b.type === "header");
      expect(headerBlock.text.text).toContain("Approved");

      process.env.SLACK_WEBHOOK_URL = originalEnv || "";
    });

    it("should include rejection reason when status is rejected", async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";

      vi.resetModules();
      const { notifySlackStatusChange } = await import("./slack");

      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "ok" } as Response);

      await notifySlackStatusChange({
        title: "Bad Use Case",
        status: "rejected",
        adminName: "Admin Bob",
        reason: "Not a real use case",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain("Rejected");
      // Should have a reason block
      const reasonBlock = body.blocks.find(
        (b: any) => b.type === "section" && b.text?.text?.includes("Reason")
      );
      expect(reasonBlock).toBeDefined();
      expect(reasonBlock.text.text).toContain("Not a real use case");

      process.env.SLACK_WEBHOOK_URL = originalEnv || "";
    });
  });

  describe("escapeSlackMarkdown (via integration)", () => {
    it("should escape special characters in titles", async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";

      vi.resetModules();
      const { notifySlackStatusChange } = await import("./slack");

      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "ok" } as Response);

      await notifySlackStatusChange({
        title: "Use <script> & more",
        status: "approved",
        adminName: "Admin",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const sectionBlock = body.blocks.find(
        (b: any) => b.type === "section" && b.text?.text?.includes("&amp;")
      );
      expect(sectionBlock).toBeDefined();
      expect(sectionBlock.text.text).toContain("&lt;script&gt;");
      expect(sectionBlock.text.text).toContain("&amp;");

      process.env.SLACK_WEBHOOK_URL = originalEnv || "";
    });
  });
});
