import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import {
  getAllCategories,
  getCategoriesByType,
  getApprovedUseCases,
  getUseCaseBySlug,
  getRelatedUseCases,
  createUseCase,
  toggleUpvote,
  getAdminUseCases,
  approveUseCase,
  rejectUseCase,
  updateUseCaseAdmin,
  getAdminStats,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Categories ──────────────────────────────────────────────────
  categories: router({
    list: publicProcedure.query(async () => {
      return getAllCategories();
    }),
    byType: publicProcedure
      .input(z.object({ type: z.enum(["job_function", "feature"]) }))
      .query(async ({ input }) => {
        return getCategoriesByType(input.type);
      }),
  }),

  // ─── Use Cases (Public) ──────────────────────────────────────────
  useCases: router({
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        categoryIds: z.array(z.number()).optional(),
        highlightOnly: z.boolean().optional(),
        sort: z.enum(["popular", "newest", "views"]).optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ input, ctx }) => {
        return getApprovedUseCases({
          ...input,
          userId: ctx.user?.id,
        });
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input, ctx }) => {
        return getUseCaseBySlug(input.slug, ctx.user?.id);
      }),

    related: publicProcedure
      .input(z.object({ useCaseId: z.number(), categoryIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        return getRelatedUseCases(input.useCaseId, input.categoryIds);
      }),

    // ─── Upvote (Protected) ──────────────────────────────────────
    toggleUpvote: protectedProcedure
      .input(z.object({ useCaseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return toggleUpvote(input.useCaseId, ctx.user.id);
      }),

    // ─── Submit (Protected) ──────────────────────────────────────
    submit: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(5000),
        sessionReplayUrl: z.string().url().optional().or(z.literal("")),
        deliverableUrl: z.string().url().optional().or(z.literal("")),
        language: z.string().default("en"),
        consentToContact: z.boolean().default(false),
        categoryIds: z.array(z.number()).min(1),
        screenshotUrls: z.array(z.object({
          url: z.string(),
          fileKey: z.string(),
        })).min(1).max(5),
      }))
      .mutation(async ({ input, ctx }) => {
        const useCase = await createUseCase({
          title: input.title,
          description: input.description,
          sessionReplayUrl: input.sessionReplayUrl || undefined,
          deliverableUrl: input.deliverableUrl || undefined,
          language: input.language,
          consentToContact: input.consentToContact,
          submitterId: ctx.user.id,
          categoryIds: input.categoryIds,
          screenshotData: input.screenshotUrls,
        });

        // Notify owner
        try {
          await notifyOwner({
            title: `New Use Case Submission: ${input.title}`,
            content: `A new use case has been submitted by ${ctx.user.name || "Anonymous"} (${ctx.user.email || "no email"}).\n\nTitle: ${input.title}\n\nPlease review it in the admin moderation queue.`,
          });
        } catch (e) {
          console.warn("[Notification] Failed to notify owner:", e);
        }

        return { success: true, slug: useCase.slug };
      }),

    // ─── Upload Screenshot (Protected) ───────────────────────────
    uploadScreenshot: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileBase64: z.string(),
        contentType: z.string().refine(
          ct => ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(ct),
          "Only PNG, JPG, WebP, and GIF files are allowed"
        ),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        // Check 5MB limit
        if (buffer.length > 5 * 1024 * 1024) {
          throw new Error("File size exceeds 5MB limit");
        }
        const ext = input.contentType.split("/")[1] === "jpeg" ? "jpg" : input.contentType.split("/")[1];
        const fileKey = `use-cases/${ctx.user.id}/${nanoid()}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return { url, fileKey };
      }),
  }),

  // ─── Admin ───────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      return getAdminStats();
    }),

    submissions: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ input }) => {
        return getAdminUseCases(input);
      }),

    approve: adminProcedure
      .input(z.object({
        id: z.number(),
        categoryIds: z.array(z.number()),
        isHighlight: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await approveUseCase(input.id, {
          categoryIds: input.categoryIds,
          isHighlight: input.isHighlight,
        });
        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await rejectUseCase(input.id, input.reason);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        categoryIds: z.array(z.number()).optional(),
        isHighlight: z.boolean().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateUseCaseAdmin(id, data);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
