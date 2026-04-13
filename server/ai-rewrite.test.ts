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

describe("admin.aiRewrite", () => {
  it("rejects non-admin users", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.aiRewrite({ useCaseId: 1, field: "both" })
    ).rejects.toThrow();
  });

  it("is accessible to admin users (may fail if use case ID doesn't exist)", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.aiRewrite({ useCaseId: 999999, field: "both" })
    ).rejects.toThrow(/Use case not found|Database not available/);
  });

  it("requires useCaseId input", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error - testing missing input
    await expect(caller.admin.aiRewrite({})).rejects.toThrow();
  });

  it("requires field input", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error - testing missing field
    await expect(caller.admin.aiRewrite({ useCaseId: 1 })).rejects.toThrow();
  });

  it("rejects invalid field values", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(
      // @ts-expect-error - testing invalid field
      caller.admin.aiRewrite({ useCaseId: 1, field: "invalid" })
    ).rejects.toThrow();
  });

  it("accepts valid field values: title, description, both", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    // All three should pass input validation but fail on DB lookup
    for (const field of ["title", "description", "both"] as const) {
      await expect(
        caller.admin.aiRewrite({ useCaseId: 999999, field })
      ).rejects.toThrow(/Use case not found|Database not available/);
    }
  });

  it("accepts optional currentTitle and currentDescription", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.aiRewrite({
        useCaseId: 999999,
        field: "both",
        currentTitle: "My Custom Title",
        currentDescription: "My custom description",
      })
    ).rejects.toThrow(/Use case not found|Database not available/);
  });
});
