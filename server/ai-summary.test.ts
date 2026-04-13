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

describe("admin.generateSummary", () => {
  it("rejects non-admin users", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.generateSummary({ useCaseId: 1 })).rejects.toThrow();
  });

  it("is accessible to admin users (may fail if use case ID doesn't exist)", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    // Using a non-existent ID should throw "Use case not found", not an auth error
    await expect(caller.admin.generateSummary({ useCaseId: 999999 })).rejects.toThrow(
      /Use case not found|Database not available/
    );
  });

  it("requires useCaseId input", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error - testing missing input
    await expect(caller.admin.generateSummary({})).rejects.toThrow();
  });
});
