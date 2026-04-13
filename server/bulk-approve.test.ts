import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("admin.bulkApprove", () => {
  it("rejects unauthenticated calls", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });

    await expect(caller.admin.bulkApprove()).rejects.toThrow();
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller({
      user: { id: 999, role: "user", openId: "test", name: "Test", email: "test@test.com" } as any,
      req: { headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    });

    await expect(caller.admin.bulkApprove()).rejects.toThrow();
  });
});
