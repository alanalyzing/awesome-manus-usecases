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

  describe("notifySlackStatusChange", () => {
    it("should return false when SLACK_WEBHOOK_URL is not set", async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      delete process.env.SLACK_WEBHOOK_URL;

      vi.resetModules();
      const { notifySlackStatusChange } = await import("./slack");
      const result = await notifySlackStatusChange({
        title: "Test Use Case",
        status: "approved",
        adminName: "Admin",
      });
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();

      if (originalEnv !== undefined) process.env.SLACK_WEBHOOK_URL = originalEnv;
    });

    it("should send simple approved notification without details", async () => {
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

    it("should send rich approved notification with full use case details", async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";

      vi.resetModules();
      const { notifySlackStatusChange } = await import("./slack");

      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "ok" } as Response);

      const result = await notifySlackStatusChange({
        title: "My Amazing Use Case",
        status: "approved",
        adminName: "Admin Alice",
        details: {
          description: "Built a full marketing campaign with Manus",
          submitterName: "Liyun Goh",
          submitterEmail: "liyun@manus.ai",
          language: "en",
          categoryNames: ["Marketing", "Image & Video Generation"],
          screenshotCount: 3,
          sessionReplayUrl: "https://manus.im/share/123",
          deliverableUrl: "https://example.com/result",
        },
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

      // Should have header block with "Approved"
      const headerBlock = body.blocks.find((b: any) => b.type === "header");
      expect(headerBlock).toBeDefined();
      expect(headerBlock.text.text).toContain("Approved");

      // Should have fields block with submitter info, language, categories, screenshots
      const fieldsBlock = body.blocks.find((b: any) => b.type === "section" && b.fields);
      expect(fieldsBlock).toBeDefined();
      expect(fieldsBlock.fields.length).toBe(4);

      // Should have "Approved by" section
      const approvedByBlock = body.blocks.find(
        (b: any) => b.type === "section" && b.text?.text?.includes("Approved by")
      );
      expect(approvedByBlock).toBeDefined();
      expect(approvedByBlock.text.text).toContain("Admin Alice");

      // Should have action buttons for session replay and deliverable
      const actionsBlock = body.blocks.find((b: any) => b.type === "actions");
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock.elements.length).toBe(2);

      // Should have context block linking to the library
      const contextBlock = body.blocks.find((b: any) => b.type === "context");
      expect(contextBlock).toBeDefined();

      process.env.SLACK_WEBHOOK_URL = originalEnv || "";
    });

    it("should truncate long descriptions in rich approval notification", async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";

      vi.resetModules();
      const { notifySlackStatusChange } = await import("./slack");

      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "ok" } as Response);

      const longDesc = "A".repeat(500);
      await notifySlackStatusChange({
        title: "Test",
        status: "approved",
        adminName: "Admin",
        details: {
          description: longDesc,
          submitterName: "Test",
          submitterEmail: "test@test.com",
          language: "en",
          categoryNames: [],
          screenshotCount: 1,
        },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Find the description block (section with plain text, not bold title, not fields)
      const descBlock = body.blocks.find(
        (b: any) => b.type === "section" && b.text && !b.fields && b.text.text.startsWith("A")
      );
      expect(descBlock).toBeDefined();
      expect(descBlock.text.text.length).toBeLessThanOrEqual(303); // 297 + "..."

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
      const reasonBlock = body.blocks.find(
        (b: any) => b.type === "section" && b.text?.text?.includes("Reason")
      );
      expect(reasonBlock).toBeDefined();
      expect(reasonBlock.text.text).toContain("Not a real use case");

      process.env.SLACK_WEBHOOK_URL = originalEnv || "";
    });

    it("should return false when fetch fails", async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_URL;
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";

      vi.resetModules();
      const { notifySlackStatusChange } = await import("./slack");

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await notifySlackStatusChange({
        title: "Test",
        status: "approved",
        adminName: "Admin",
      });

      expect(result).toBe(false);

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
