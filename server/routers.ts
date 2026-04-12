import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import {
  getAllCategories,
  getCategoriesByType,
  getApprovedUseCases,
  getUseCaseBySlug,
  getRelatedUseCases,
  getTrendingUseCases,
  createUseCase,
  toggleUpvote,
  getAdminUseCases,
  approveUseCase,
  rejectUseCase,
  updateUseCaseAdmin,
  getAdminStats,
  getSubmissionTrends,
  createSubmitterNotification,
  getSubmitterNotifications,
  markNotificationsRead,
  getUnreadNotificationCount,
  getUserSubmissions,
  getAllUsers,
  setUserRole,
  logAdminAction,
  getAdminActivityLog,
  saveAiScore,
  getAiScore,
  getDb,
  getUpvoteTrends,
  getViewTrends,
  getTrafficSummary,
  getContributorLeaderboard,
  getPendingWithoutAiScore,
} from "./db";
import { useCases, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/** Derive a stable visitor key from IP + User-Agent for anonymous upvote dedup */
function getVisitorKey(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  return createHash("sha256").update(`${ip}:${ua}`).digest("hex").substring(0, 32);
}

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
        const visitorKey = getVisitorKey(ctx.req);
        return getApprovedUseCases({
          ...input,
          visitorKey,
        });
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input, ctx }) => {
        const visitorKey = getVisitorKey(ctx.req);
        return getUseCaseBySlug(input.slug, visitorKey);
      }),

    related: publicProcedure
      .input(z.object({ useCaseId: z.number(), categoryIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        return getRelatedUseCases(input.useCaseId, input.categoryIds);
      }),

    trending: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).optional() }).optional())
      .query(async ({ input }) => {
        return getTrendingUseCases(input?.limit ?? 6);
      }),

    // ─── Upvote (Public — no login required) ────────────────────
    toggleUpvote: publicProcedure
      .input(z.object({ useCaseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const visitorKey = getVisitorKey(ctx.req);
        return toggleUpvote(input.useCaseId, visitorKey);
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
        if (buffer.length > 5 * 1024 * 1024) {
          throw new Error("File size exceeds 5MB limit");
        }
        const ext = input.contentType.split("/")[1] === "jpeg" ? "jpg" : input.contentType.split("/")[1];
        const fileKey = `use-cases/${ctx.user.id}/${nanoid()}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return { url, fileKey };
      }),
  }),

  // ─── User Notifications & Submissions ─────────────────────────────
  user: router({
    notifications: protectedProcedure.query(async ({ ctx }) => {
      return getSubmitterNotifications(ctx.user.id);
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotificationCount(ctx.user.id);
    }),

    markNotificationsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markNotificationsRead(ctx.user.id);
      return { success: true };
    }),

    mySubmissions: protectedProcedure.query(async ({ ctx }) => {
      return getUserSubmissions(ctx.user.id);
    }),
  }),

  // ─── Admin ───────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      return getAdminStats();
    }),

    submissionTrends: adminProcedure
      .input(z.object({ days: z.number().min(7).max(365).optional() }).optional())
      .query(async ({ input }) => {
        return getSubmissionTrends(input?.days ?? 30);
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
      .mutation(async ({ input, ctx }) => {
        await approveUseCase(input.id, {
          categoryIds: input.categoryIds,
          isHighlight: input.isHighlight,
        });

        // Log admin action
        await logAdminAction({
          adminId: ctx.user.id,
          action: "approve",
          targetType: "use_case",
          targetId: input.id,
          details: JSON.stringify({ categoryIds: input.categoryIds, isHighlight: input.isHighlight }),
        });

        // Notify submitter (in-app + owner notification)
        const db = await getDb();
        if (db) {
          const uc = await db.select().from(useCases).where(eq(useCases.id, input.id)).limit(1);
          if (uc.length > 0) {
            const submitter = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, uc[0].submitterId)).limit(1);
            const submitterName = submitter[0]?.name || "Anonymous";
            const submitterEmail = submitter[0]?.email || "no email";

            // In-app notification
            await createSubmitterNotification({
              useCaseId: input.id,
              userId: uc[0].submitterId,
              type: "approved",
              message: `Your use case "${uc[0].title}" has been approved and is now live in the gallery!`,
            });

            // Owner notification (email digest)
            await notifyOwner({
              title: `Use Case Approved: ${uc[0].title}`,
              content: `Admin ${ctx.user.name || "Unknown"} approved the use case "${uc[0].title}" submitted by ${submitterName} (${submitterEmail}).\n\nThe use case is now live in the gallery.`,
            }).catch(() => {}); // Non-blocking
          }
        }

        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await rejectUseCase(input.id, input.reason);

        await logAdminAction({
          adminId: ctx.user.id,
          action: "reject",
          targetType: "use_case",
          targetId: input.id,
          details: JSON.stringify({ reason: input.reason }),
        });

        // Notify submitter (in-app + owner notification)
        const db = await getDb();
        if (db) {
          const uc = await db.select().from(useCases).where(eq(useCases.id, input.id)).limit(1);
          if (uc.length > 0) {
            const submitter = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, uc[0].submitterId)).limit(1);
            const submitterName = submitter[0]?.name || "Anonymous";
            const submitterEmail = submitter[0]?.email || "no email";

            // In-app notification
            await createSubmitterNotification({
              useCaseId: input.id,
              userId: uc[0].submitterId,
              type: "rejected",
              message: `Your use case "${uc[0].title}" was not approved. Reason: ${input.reason}`,
            });

            // Owner notification (email digest)
            await notifyOwner({
              title: `Use Case Rejected: ${uc[0].title}`,
              content: `Admin ${ctx.user.name || "Unknown"} rejected the use case "${uc[0].title}" submitted by ${submitterName} (${submitterEmail}).\n\nReason: ${input.reason}`,
            }).catch(() => {}); // Non-blocking
          }
        }

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
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateUseCaseAdmin(id, data);

        await logAdminAction({
          adminId: ctx.user.id,
          action: "edit",
          targetType: "use_case",
          targetId: id,
          details: JSON.stringify(data),
        });

        return { success: true };
      }),

    // ─── Admin Management ──────────────────────────────────────────
    listUsers: adminProcedure.query(async () => {
      return getAllUsers();
    }),

    promoteToAdmin: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await setUserRole(input.userId, "admin");
        await logAdminAction({
          adminId: ctx.user.id,
          action: "promote_admin",
          targetType: "user",
          targetId: input.userId,
        });
        return { success: true };
      }),

    demoteToUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await setUserRole(input.userId, "user");
        await logAdminAction({
          adminId: ctx.user.id,
          action: "demote_admin",
          targetType: "user",
          targetId: input.userId,
        });
        return { success: true };
      }),

    // ─── Activity Log ──────────────────────────────────────────────
    activityLog: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        adminId: z.number().optional(),
        action: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAdminActivityLog(input ?? {});
      }),

    // ─── AI Pre-Scan ───────────────────────────────────────────────
    aiScan: adminProcedure
      .input(z.object({ useCaseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const ucRows = await db.select().from(useCases).where(eq(useCases.id, input.useCaseId)).limit(1);
        if (ucRows.length === 0) throw new Error("Use case not found");
        const uc = ucRows[0];

        const prompt = `You are an expert evaluator for a use case library. Evaluate the following use case submission for a product called "Manus" (an AI agent platform).

Use Case Title: ${uc.title}
Description: ${uc.description}
Session Replay URL: ${uc.sessionReplayUrl || "Not provided"}
Deliverable URL: ${uc.deliverableUrl || "Not provided"}

Score this use case on five criteria, each from 0.0 to 5.0 (one decimal place):

1. **Completeness** (0-5): How complete is the submission? Does it have a clear title, detailed description, working links, and sufficient context for others to understand the use case end-to-end?
2. **Innovativeness** (0-5): How creative or novel is this use case? Does it demonstrate a unique application of Manus, or is it a routine/common task?
3. **Impact** (0-5): How much value does this use case create for its target user segment? Would it inspire others, demonstrate significant productivity gains, or solve an important problem?
4. **Complexity** (0-5): How technically ambitious is this use case? Does it chain multiple Manus capabilities together (e.g., research + data analysis + visualization + report generation), or is it a single straightforward task? Higher scores for multi-step, cross-capability workflows.
5. **Presentation** (0-5): How well is the use case documented and showcased? Is the description well-written and informative? Does the session replay or deliverable link work and tell a compelling story? Higher scores for clear, professional, and engaging submissions.

Also compute an overall score as the weighted average: Completeness (20%) + Innovativeness (25%) + Impact (25%) + Complexity (15%) + Presentation (15%).

Return your evaluation as JSON.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert evaluator. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ai_evaluation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  completeness: { type: "number", description: "Score 0.0-5.0" },
                  innovativeness: { type: "number", description: "Score 0.0-5.0" },
                  impact: { type: "number", description: "Score 0.0-5.0" },
                  complexity: { type: "number", description: "Score 0.0-5.0" },
                  presentation: { type: "number", description: "Score 0.0-5.0" },
                  overall: { type: "number", description: "Weighted average score 0.0-5.0" },
                  reasoning: { type: "string", description: "Brief explanation of the scores" },
                },
                required: ["completeness", "innovativeness", "impact", "complexity", "presentation", "overall", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = result.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "{}");

        const scores = {
          useCaseId: input.useCaseId,
          completenessScore: String(Math.min(5, Math.max(0, Number(parsed.completeness) || 0)).toFixed(1)),
          innovativenessScore: String(Math.min(5, Math.max(0, Number(parsed.innovativeness) || 0)).toFixed(1)),
          impactScore: String(Math.min(5, Math.max(0, Number(parsed.impact) || 0)).toFixed(1)),
          complexityScore: String(Math.min(5, Math.max(0, Number(parsed.complexity) || 0)).toFixed(1)),
          presentationScore: String(Math.min(5, Math.max(0, Number(parsed.presentation) || 0)).toFixed(1)),
          overallScore: String(Math.min(5, Math.max(0, Number(parsed.overall) || 0)).toFixed(1)),
          reasoning: parsed.reasoning || "No reasoning provided",
        };

        await saveAiScore(scores);

        await logAdminAction({
          adminId: ctx.user.id,
          action: "ai_scan",
          targetType: "use_case",
          targetId: input.useCaseId,
          details: JSON.stringify(scores),
        });

        return {
          overall: scores.overallScore,
          completeness: scores.completenessScore,
          innovativeness: scores.innovativenessScore,
          impact: scores.impactScore,
          complexity: scores.complexityScore,
          presentation: scores.presentationScore,
          reasoning: scores.reasoning,
        };
      }),

    getAiScore: adminProcedure
      .input(z.object({ useCaseId: z.number() }))
      .query(async ({ input }) => {
        const score = await getAiScore(input.useCaseId);
        if (!score) return null;
        return {
          overall: score.overallScore,
          completeness: score.completenessScore,
          innovativeness: score.innovativenessScore,
          impact: score.impactScore,
          complexity: score.complexityScore,
          presentation: score.presentationScore,
          reasoning: score.reasoning,
          scannedAt: score.scannedAt,
        };
      }),

    upvoteTrends: adminProcedure
      .input(z.object({ days: z.number().min(7).max(365).optional() }).optional())
      .query(async ({ input }) => {
        return getUpvoteTrends(input?.days ?? 30);
      }),

    viewTrends: adminProcedure
      .input(z.object({ days: z.number().min(7).max(365).optional() }).optional())
      .query(async ({ input }) => {
        return getViewTrends(input?.days ?? 30);
      }),

    trafficSummary: adminProcedure.query(async () => {
      return getTrafficSummary();
    }),

    // ─── Contributor Leaderboard ────────────────────────────────
    contributorLeaderboard: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ input }) => {
        return getContributorLeaderboard(input?.limit ?? 10);
      }),

    // ─── Bulk AI Scan ───────────────────────────────────────────
    bulkAiScan: adminProcedure.mutation(async ({ ctx }) => {
      const pendingIds = await getPendingWithoutAiScore();
      if (pendingIds.length === 0) return { scanned: 0, total: 0, results: [] };

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results: { id: number; overall: string; success: boolean }[] = [];

      for (const ucId of pendingIds) {
        try {
          const ucRows = await db.select().from(useCases).where(eq(useCases.id, ucId)).limit(1);
          if (ucRows.length === 0) { results.push({ id: ucId, overall: "0", success: false }); continue; }
          const uc = ucRows[0];

          const prompt = `You are an expert evaluator for a use case library. Evaluate the following use case submission for a product called "Manus" (an AI agent platform).

Use Case Title: ${uc.title}
Description: ${uc.description}
Session Replay URL: ${uc.sessionReplayUrl || "Not provided"}
Deliverable URL: ${uc.deliverableUrl || "Not provided"}

Score this use case on five criteria, each from 0.0 to 5.0 (one decimal place):

1. **Completeness** (0-5): How complete is the submission?
2. **Innovativeness** (0-5): How creative or novel is this use case?
3. **Impact** (0-5): How much value does this use case create?
4. **Complexity** (0-5): How technically ambitious is this use case?
5. **Presentation** (0-5): How well is the use case documented?

Also compute an overall score as the weighted average: Completeness (20%) + Innovativeness (25%) + Impact (25%) + Complexity (15%) + Presentation (15%).

Return your evaluation as JSON.`;

          const result = await invokeLLM({
            messages: [
              { role: "system", content: "You are an expert evaluator. Return only valid JSON." },
              { role: "user", content: prompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "ai_evaluation",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    completeness: { type: "number", description: "Score 0.0-5.0" },
                    innovativeness: { type: "number", description: "Score 0.0-5.0" },
                    impact: { type: "number", description: "Score 0.0-5.0" },
                    complexity: { type: "number", description: "Score 0.0-5.0" },
                    presentation: { type: "number", description: "Score 0.0-5.0" },
                    overall: { type: "number", description: "Weighted average score 0.0-5.0" },
                    reasoning: { type: "string", description: "Brief explanation of the scores" },
                  },
                  required: ["completeness", "innovativeness", "impact", "complexity", "presentation", "overall", "reasoning"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = result.choices[0]?.message?.content;
          const parsed = JSON.parse(typeof content === "string" ? content : "{}");

          const scores = {
            useCaseId: ucId,
            completenessScore: String(Math.min(5, Math.max(0, Number(parsed.completeness) || 0)).toFixed(1)),
            innovativenessScore: String(Math.min(5, Math.max(0, Number(parsed.innovativeness) || 0)).toFixed(1)),
            impactScore: String(Math.min(5, Math.max(0, Number(parsed.impact) || 0)).toFixed(1)),
            complexityScore: String(Math.min(5, Math.max(0, Number(parsed.complexity) || 0)).toFixed(1)),
            presentationScore: String(Math.min(5, Math.max(0, Number(parsed.presentation) || 0)).toFixed(1)),
            overallScore: String(Math.min(5, Math.max(0, Number(parsed.overall) || 0)).toFixed(1)),
            reasoning: parsed.reasoning || "No reasoning provided",
          };

          await saveAiScore(scores);
          results.push({ id: ucId, overall: scores.overallScore, success: true });

          await logAdminAction({
            adminId: ctx.user.id,
            action: "ai_scan",
            targetType: "use_case",
            targetId: ucId,
            details: JSON.stringify(scores),
          });
        } catch (e) {
          console.warn(`[BulkAiScan] Failed for use case ${ucId}:`, e);
          results.push({ id: ucId, overall: "0", success: false });
        }
      }

      return { scanned: results.filter(r => r.success).length, total: pendingIds.length, results };
    }),

    // ─── CSV Export ──────────────────────────────────────────────
    exportAnalytics: adminProcedure
      .input(z.object({ days: z.number().min(7).max(365).optional() }).optional())
      .query(async ({ input }) => {
        const days = input?.days ?? 30;
        const [submissions, upvoteTrends, viewTrends, traffic] = await Promise.all([
          getSubmissionTrends(days),
          getUpvoteTrends(days),
          getViewTrends(days),
          getTrafficSummary(),
        ]);

        // Build a date-keyed map combining all metrics
        const dateMap = new Map<string, { submissions: number; approvals: number; upvotes: number; views: number }>();
        for (const s of submissions) {
          dateMap.set(s.date, { submissions: s.submissions, approvals: s.approvals, upvotes: 0, views: 0 });
        }
        for (const u of upvoteTrends) {
          const existing = dateMap.get(u.date) ?? { submissions: 0, approvals: 0, upvotes: 0, views: 0 };
          existing.upvotes = u.upvotes;
          dateMap.set(u.date, existing);
        }
        for (const v of viewTrends) {
          const existing = dateMap.get(v.date) ?? { submissions: 0, approvals: 0, upvotes: 0, views: 0 };
          existing.views = v.views;
          dateMap.set(v.date, existing);
        }

        const rows = Array.from(dateMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => `${date},${data.submissions},${data.approvals},${data.upvotes},${data.views}`);

        const csv = ["Date,Submissions,Approvals,Upvotes,Views", ...rows].join("\n");

        return {
          csv,
          summary: {
            totalViews: traffic.totalViews,
            totalUpvotes: traffic.totalUpvotes,
            totalUseCases: traffic.totalUseCases,
            totalContributors: traffic.totalContributors,
          },
        };
      }),
  }),

});

export type AppRouter = typeof appRouter;
