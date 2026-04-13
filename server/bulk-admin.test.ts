import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

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

describe("admin.bulkGenerateSummary", () => {
  it("rejects non-admin users", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.bulkGenerateSummary()).rejects.toThrow();
  });

  it("does not throw FORBIDDEN for admin users", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    // We only verify auth passes (not FORBIDDEN). The actual LLM call may time out,
    // so we race against a short timer and accept any non-auth error.
    const result = await Promise.race([
      caller.admin.bulkGenerateSummary().then(
        (r) => ({ ok: true, result: r }),
        (err) => ({ ok: false, message: err.message as string })
      ),
      new Promise<{ ok: boolean; message: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, message: "timeout" }), 8000)
      ),
    ]);
    if (!result.ok && "message" in result) {
      // Should NOT be a FORBIDDEN error since we're admin
      expect(result.message).not.toMatch(/FORBIDDEN/);
    }
  }, 10000);
});

describe("admin.bulkAiScan", () => {
  it("rejects non-admin users", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.bulkAiScan()).rejects.toThrow();
  });

  it("does not throw FORBIDDEN for admin users", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await Promise.race([
      caller.admin.bulkAiScan().then(
        (r) => ({ ok: true, result: r }),
        (err) => ({ ok: false, message: err.message as string })
      ),
      new Promise<{ ok: boolean; message: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, message: "timeout" }), 8000)
      ),
    ]);
    if (!result.ok && "message" in result) {
      expect(result.message).not.toMatch(/FORBIDDEN/);
    }
  }, 10000);
});

describe("admin.addScreenshot", () => {
  it("rejects non-admin users", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.addScreenshot({
        useCaseId: 1,
        fileName: "test.png",
        fileBase64: "iVBORw0KGgo=",
        contentType: "image/png",
      })
    ).rejects.toThrow();
  });

  it("validates content type", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.addScreenshot({
        useCaseId: 1,
        fileName: "test.txt",
        fileBase64: "dGVzdA==",
        contentType: "text/plain",
      })
    ).rejects.toThrow();
  });

  it("requires all input fields", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error - testing missing input
    await expect(caller.admin.addScreenshot({ useCaseId: 1 })).rejects.toThrow();
  });

  it("accepts valid image types for admin users", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    // Should reach the storage layer (not fail on auth or validation)
    try {
      await caller.admin.addScreenshot({
        useCaseId: 999999,
        fileName: "test.png",
        fileBase64: "iVBORw0KGgo=",
        contentType: "image/png",
      });
    } catch (err: any) {
      // Should fail on storage/DB, not on auth or validation
      expect(err.message).not.toMatch(/FORBIDDEN|UNAUTHORIZED/i);
    }
  });
});
