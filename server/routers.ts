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
  isUsernameValid,
  isUsernameTaken,
  getProfileByUserId,
  getProfileByUsername,
  createProfile,
  updateProfile,
  toggleFollow,
  isFollowing,
  getFollowers,
  getFollowing,
  getLikedUseCases,
  getProfileStats,
  updateAiScore,
  getAverageScoresForUser,
  saveAiSummary,
  getWithoutAiSummary,
  addScreenshotToUseCase,
} from "./db";
import { useCases, users, categories, useCaseCategories } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { notifySlackNewSubmission, notifySlackStatusChange } from "./slack";

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
        sort: z.enum(["popular", "newest", "views", "score"]).optional(),
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

    trending: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).optional() }).optional())
      .query(async ({ input }) => {
        return getTrendingUseCases(input?.limit ?? 6);
      }),

    // ─── Upvote (Protected — login required) ────────────────────
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

        // Notify Slack channel (non-blocking)
        try {
          const db = await getDb();
          let categoryNames: string[] = [];
          if (db && input.categoryIds.length > 0) {
            const cats = await db.select({ name: categories.name })
              .from(categories)
              .where(inArray(categories.id, input.categoryIds));
            categoryNames = cats.map(c => c.name);
          }
          notifySlackNewSubmission({
            title: input.title,
            description: input.description,
            submitterName: ctx.user.name || "Anonymous",
            submitterEmail: ctx.user.email || "no email",
            language: input.language,
            categoryNames,
            sessionReplayUrl: input.sessionReplayUrl || undefined,
            deliverableUrl: input.deliverableUrl || undefined,
            screenshotCount: input.screenshotUrls.length,
          }).catch(err => console.warn("[Slack] Failed:", err));
        } catch (e) {
          console.warn("[Slack] Failed to prepare notification:", e);
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

  // ─── Profile ──────────────────────────────────────────────────────
  profile: router({
    // Check username availability (public — for real-time validation)
    checkUsername: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        const validation = isUsernameValid(input.username);
        if (!validation.valid) return { available: false, reason: validation.reason };
        const taken = await isUsernameTaken(input.username);
        return { available: !taken, reason: taken ? "This username is already taken" : undefined };
      }),

    // Get current user's profile (protected)
    me: protectedProcedure.query(async ({ ctx }) => {
      return getProfileByUserId(ctx.user.id);
    }),

    // Get public profile by username
    getByUsername: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        return getProfileByUsername(input.username);
      }),

    // Average scores for a user's approved use cases (public — for profile radar chart)
    averageScores: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getAverageScoresForUser(input.userId);
      }),

    // Create profile (protected, one per user)
    create: protectedProcedure
      .input(z.object({
        username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
        proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]),
        company: z.string().max(128).optional(),
        jobTitle: z.string().max(128).optional(),
        bio: z.string().max(500).optional(),
        socialHandles: z.array(z.object({
          platform: z.enum(["x", "instagram", "linkedin", "other"]),
          handle: z.string().min(1).max(256),
        })).min(1, "At least one social handle is required"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user already has a profile
        const existing = await getProfileByUserId(ctx.user.id);
        if (existing) throw new Error("Profile already exists. Use update instead.");

        // Validate username
        const validation = isUsernameValid(input.username);
        if (!validation.valid) throw new Error(validation.reason);
        const taken = await isUsernameTaken(input.username);
        if (taken) throw new Error("This username is already taken");

        return createProfile({
          userId: ctx.user.id,
          username: input.username,
          proficiency: input.proficiency,
          company: input.company,
          jobTitle: input.jobTitle,
          bio: input.bio,
          socialHandles: input.socialHandles,
        });
      }),

    // Update profile (protected)
    update: protectedProcedure
      .input(z.object({
        username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
        proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
        company: z.string().max(128).nullable().optional(),
        jobTitle: z.string().max(128).nullable().optional(),
        bio: z.string().max(500).nullable().optional(),
        avatarUrl: z.string().url().nullable().optional(),
        socialHandles: z.array(z.object({
          platform: z.enum(["x", "instagram", "linkedin", "other"]),
          handle: z.string().min(1).max(256),
        })).min(1, "At least one social handle is required").optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // If changing username, validate it
        if (input.username) {
          const validation = isUsernameValid(input.username);
          if (!validation.valid) throw new Error(validation.reason);
          const existing = await getProfileByUserId(ctx.user.id);
          if (existing && existing.username !== input.username) {
            // Check username change limit (max 5)
            if (existing.usernameChangeCount >= 5) {
              throw new Error("You have reached the maximum of 5 username changes");
            }
            const taken = await isUsernameTaken(input.username);
            if (taken) throw new Error("This username is already taken");
          }
        }

        const updated = await updateProfile(ctx.user.id, input);
        if (!updated) throw new Error("Profile not found");
        return updated;
      }),

    // ─── Avatar Upload ──────────────────────────────────────────
    uploadAvatar: protectedProcedure
      .input(z.object({
        fileBase64: z.string(),
        contentType: z.string().refine(
          ct => ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(ct),
          "Only PNG, JPG, WebP, and GIF files are allowed"
        ),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error("File size exceeds 10MB limit");
        }
        const ext = input.contentType.split("/")[1] === "jpeg" ? "jpg" : input.contentType.split("/")[1];
        const fileKey = `avatars/${ctx.user.id}/${nanoid()}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        // Update profile with new avatar URL
        await updateProfile(ctx.user.id, { avatarUrl: url });
        return { url };
      }),

    // ─── Follow System ──────────────────────────────────────────
    toggleFollow: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return toggleFollow(ctx.user.id, input.targetUserId);
      }),

    isFollowing: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .query(async ({ input, ctx }) => {
        return isFollowing(ctx.user.id, input.targetUserId);
      }),

    followers: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getFollowers(input.userId);
      }),

    following: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getFollowing(input.userId);
      }),

    // ─── Liked Use Cases ────────────────────────────────────────
    likedUseCases: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getLikedUseCases(input.userId);
      }),

    // ─── Profile Stats ──────────────────────────────────────────
    stats: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getProfileStats(input.userId);
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

            // Slack notification
            notifySlackStatusChange({
              title: uc[0].title,
              status: "approved",
              adminName: ctx.user.name || "Unknown",
            }).catch(() => {});
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

            // Slack notification
            notifySlackStatusChange({
              title: uc[0].title,
              status: "rejected",
              adminName: ctx.user.name || "Unknown",
              reason: input.reason,
            }).catch(() => {});
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
      .input(z.object({
        limit: z.number().min(1).max(50).optional(),
        sortBy: z.enum(["usecases", "likes"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        return getContributorLeaderboard(input?.limit ?? 10, input?.sortBy ?? "usecases");
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

    // ─── Manual Score Edit ──────────────────────────────────────
    updateScore: adminProcedure
      .input(z.object({
        useCaseId: z.number(),
        completeness: z.number().min(0).max(5),
        innovativeness: z.number().min(0).max(5),
        impact: z.number().min(0).max(5),
        complexity: z.number().min(0).max(5),
        presentation: z.number().min(0).max(5),
      }))
      .mutation(async ({ input, ctx }) => {
        const overall = (
          input.completeness * 0.20 +
          input.innovativeness * 0.25 +
          input.impact * 0.25 +
          input.complexity * 0.15 +
          input.presentation * 0.15
        );
        const data = {
          completenessScore: input.completeness.toFixed(1),
          innovativenessScore: input.innovativeness.toFixed(1),
          impactScore: input.impact.toFixed(1),
          complexityScore: input.complexity.toFixed(1),
          presentationScore: input.presentation.toFixed(1),
          overallScore: overall.toFixed(1),
        };
        await updateAiScore(input.useCaseId, data);
        await logAdminAction({
          adminId: ctx.user.id,
          action: "edit_score",
          targetType: "use_case",
          targetId: input.useCaseId,
          details: JSON.stringify(data),
        });
        return { ...data, success: true };
      }),

    // ─── Remove/Unapprove ─────────────────────────────────────────
    removeApproved: adminProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Set status back to rejected
        await db.update(useCases).set({ status: "rejected" }).where(eq(useCases.id, input.id));
        await logAdminAction({
          adminId: ctx.user.id,
          action: "remove_approved",
          targetType: "use_case",
          targetId: input.id,
          details: JSON.stringify({ reason: input.reason }),
        });
        // Notify submitter
        const uc = await db.select().from(useCases).where(eq(useCases.id, input.id)).limit(1);
        if (uc.length > 0) {
          await createSubmitterNotification({
            useCaseId: input.id,
            userId: uc[0].submitterId,
            type: "rejected",
            message: `Your use case "${uc[0].title}" has been removed from the gallery. Reason: ${input.reason}`,
          });
        }
        return { success: true };
      }),

    // ─── AI Summary Generation ──────────────────────────────────
    generateSummary: adminProcedure
      .input(z.object({ useCaseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const ucRows = await db.select().from(useCases).where(eq(useCases.id, input.useCaseId)).limit(1);
        if (ucRows.length === 0) throw new Error("Use case not found");
        const uc = ucRows[0];

        const userMessage = `Here are the details of the use case submission:

Title: ${uc.title}
Description: ${uc.description}
Session Replay URL: ${uc.sessionReplayUrl || "Not provided"}
Deliverable URL: ${uc.deliverableUrl || "Not provided"}

Return the title on the first line, then a blank line, then the 2-sentence description. No quotes, no labels, no markdown.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "Review this use case replay session and write a short title and 2-sentence description for it. The title should follow the format \"Category: What it does\" and be concise. The description should be industry and brand agnostic, describing what the use case does at a high level without referencing specific companies, products, or sectors. Structure the description by answering: what problem did it solve, how did Manus help, and what was the outcome. Do not use em dashes." },
            { role: "user", content: userMessage },
          ],
        });

        const rawContent = result.choices[0]?.message?.content ?? "";
        const summary = (typeof rawContent === "string" ? rawContent : "").trim();
        if (!summary) throw new Error("AI returned empty summary");

        // Save to database
        await saveAiSummary(input.useCaseId, summary);

        await logAdminAction({
          adminId: ctx.user.id,
          action: "ai_summary",
          targetType: "use_case",
          targetId: input.useCaseId,
          details: JSON.stringify({ summary: summary.substring(0, 200) }),
        });

        return { summary };
      }),

    // ─── Admin Add Screenshot ─────────────────────────────────
    addScreenshot: adminProcedure
      .input(z.object({
        useCaseId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(),
        contentType: z.string().refine(
          ct => ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(ct),
          "Only PNG, JPG, WebP, and GIF files are allowed"
        ),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error("File size exceeds 10MB limit");
        }
        const ext = input.contentType.split("/")[1] === "jpeg" ? "jpg" : input.contentType.split("/")[1];
        const fileKey = `use-cases/admin/${ctx.user.id}/${nanoid()}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        const result = await addScreenshotToUseCase(input.useCaseId, url, fileKey);
        await logAdminAction({
          adminId: ctx.user.id,
          action: "edit",
          targetType: "use_case",
          targetId: input.useCaseId,
          details: JSON.stringify({ action: "add_screenshot", url }),
        });
        return result;
      }),

    // ─── Bulk AI Summary Generation ─────────────────────────────
    bulkGenerateSummary: adminProcedure.mutation(async ({ ctx }) => {
      const ids = await getWithoutAiSummary();
      if (ids.length === 0) return { generated: 0, total: 0 };

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let generated = 0;
      for (const ucId of ids) {
        try {
          const ucRows = await db.select().from(useCases).where(eq(useCases.id, ucId)).limit(1);
          if (ucRows.length === 0) continue;
          const uc = ucRows[0];

          const userMessage = `Here are the details of the use case submission:\n\nTitle: ${uc.title}\nDescription: ${uc.description}\nSession Replay URL: ${uc.sessionReplayUrl || "Not provided"}\nDeliverable URL: ${uc.deliverableUrl || "Not provided"}\n\nReturn the title on the first line, then a blank line, then the 2-sentence description. No quotes, no labels, no markdown.`;

          const result = await invokeLLM({
            messages: [
              { role: "system", content: "Review this use case replay session and write a short title and 2-sentence description for it. The title should follow the format \\\"Category: What it does\\\" and be concise. The description should be industry and brand agnostic, describing what the use case does at a high level without referencing specific companies, products, or sectors. Structure the description by answering: what problem did it solve, how did Manus help, and what was the outcome. Do not use em dashes." },
              { role: "user", content: userMessage },
            ],
          });

          const rawContent = result.choices[0]?.message?.content ?? "";
          const summary = (typeof rawContent === "string" ? rawContent : "").trim();
          if (!summary) continue;

          await saveAiSummary(ucId, summary);
          generated++;

          await logAdminAction({
            adminId: ctx.user.id,
            action: "ai_summary",
            targetType: "use_case",
            targetId: ucId,
            details: JSON.stringify({ summary: summary.substring(0, 200) }),
          });
        } catch (e) {
          console.warn(`[BulkSummary] Failed for use case ${ucId}:`, e);
        }
      }

      return { generated, total: ids.length };
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
