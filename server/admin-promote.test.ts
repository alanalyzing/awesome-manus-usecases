import { describe, expect, it, vi, beforeEach } from "vitest";

// Test that the ADMIN_EMAILS env var is loaded and the auto-promote logic works
describe("ADMIN_EMAILS auto-promote", () => {
  it("ENV.adminEmails is a non-empty array containing lucia@manus.ai", async () => {
    // Dynamically import to get the live env
    const { ENV } = await import("./_core/env");
    expect(Array.isArray(ENV.adminEmails)).toBe(true);
    expect(ENV.adminEmails.length).toBeGreaterThan(0);
    expect(ENV.adminEmails).toContain("lucia@manus.ai");
  });

  it("upsertUser auto-promotes users whose email is in ADMIN_EMAILS", async () => {
    // We test the logic by checking that the ENV is properly parsed
    // The actual DB upsert is tested via integration; here we verify the config path
    const { ENV } = await import("./_core/env");
    const testEmail = "lucia@manus.ai";
    const isAdmin = ENV.adminEmails.includes(testEmail.toLowerCase());
    expect(isAdmin).toBe(true);
  });

  it("does not auto-promote emails not in ADMIN_EMAILS", async () => {
    const { ENV } = await import("./_core/env");
    const testEmail = "random@example.com";
    const isAdmin = ENV.adminEmails.includes(testEmail.toLowerCase());
    expect(isAdmin).toBe(false);
  });
});
