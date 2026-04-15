import { eq, and, sql, desc, asc, like, or, inArray, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  categories, Category,
  useCases, UseCase, InsertUseCase,
  useCaseCategories,
  screenshots, Screenshot,
  upvotes,
  submitterNotifications, SubmitterNotification,
  adminActivityLog, AdminActivityLog,
  aiScores, AiScore,
  viewEvents,
  userProfiles, UserProfile, InsertUserProfile,
  userSocialHandles, UserSocialHandle, InsertUserSocialHandle,
  userFollows,
  collections, Collection, InsertCollection,
  collectionUseCases, CollectionUseCase,
  featuredUseCase, FeaturedUseCase, InsertFeaturedUseCase,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Helpers ────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    else if (user.email && ENV.adminEmails.includes(user.email.toLowerCase())) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(): Promise<{ id: number; name: string | null; email: string | null; role: string; createdAt: Date }[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt));
}

export async function setUserRole(userId: number, role: "user" | "admin"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Category Helpers ────────────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategoriesWithCounts(): Promise<(Category & { count: number })[]> {
  const db = await getDb();
  if (!db) return [];
  const allCats = await db.select().from(categories).orderBy(asc(categories.type), asc(categories.sortOrder));
  const countRows = await db
    .select({
      categoryId: useCaseCategories.categoryId,
      count: sql<number>`count(DISTINCT ${useCaseCategories.useCaseId})`,
    })
    .from(useCaseCategories)
    .innerJoin(useCases, and(eq(useCaseCategories.useCaseId, useCases.id), eq(useCases.status, "approved")))
    .groupBy(useCaseCategories.categoryId);
  const countMap = new Map(countRows.map(r => [r.categoryId, Number(r.count)]));
  return allCats.map(cat => ({ ...cat, count: countMap.get(cat.id) ?? 0 }));
}

export async function getCategoriesByType(type: "job_function" | "feature"): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.type, type)).orderBy(asc(categories.sortOrder));
}

// ─── Use Case Helpers ────────────────────────────────────────────────

export type UseCaseWithDetails = UseCase & {
  submitterName: string | null;
  submitterUsername: string | null;
  submitterAvatar: string | null;
  categories: { id: number; name: string; slug: string; type: string }[];
  screenshots: { id: number; url: string; blurhash?: string | null; sortOrder: number }[];
  hasUpvoted?: boolean;
  aiScore?: { overall: string; completeness: string; innovativeness: string; impact: string; complexity: string; presentation: string; reasoning: string | null } | null;
};

export async function getApprovedUseCases(opts: {
  search?: string;
  categoryIds?: number[];
  highlightOnly?: boolean;
  sort?: "popular" | "newest" | "views" | "score";
  limit?: number;
  offset?: number;
  userId?: number;
  minScore?: number;
}): Promise<{ items: UseCaseWithDetails[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [eq(useCases.status, "approved")];
  if (opts.search) {
    conditions.push(
      or(
        like(useCases.title, `%${opts.search}%`),
        like(useCases.description, `%${opts.search}%`),
        like(useCases.sessionReplayUrl, `%${opts.search}%`),
        like(useCases.deliverableUrl, `%${opts.search}%`)
      )!
    );
  }
  if (opts.highlightOnly) {
    conditions.push(eq(useCases.isHighlight, true));
  }

  // Pre-filter by minScore if requested
  let scoreFilteredIds: number[] | undefined;
  if (opts.minScore && opts.minScore > 0) {
    const scoredRows = await db
      .select({ useCaseId: aiScores.useCaseId })
      .from(aiScores)
      .where(sql`CAST(${aiScores.overallScore} AS DECIMAL(3,1)) >= ${opts.minScore}`);
    scoreFilteredIds = scoredRows.map(r => r.useCaseId);
    if (scoreFilteredIds.length === 0) return { items: [], total: 0 };
    conditions.push(inArray(useCases.id, scoreFilteredIds));
  }

  let filteredIds: number[] | undefined;
  if (opts.categoryIds && opts.categoryIds.length > 0) {
    // AND logic: use case must match ALL selected categories
    const matchingUcIds = await db
      .select({ useCaseId: useCaseCategories.useCaseId })
      .from(useCaseCategories)
      .where(inArray(useCaseCategories.categoryId, opts.categoryIds))
      .groupBy(useCaseCategories.useCaseId)
      .having(sql`count(DISTINCT ${useCaseCategories.categoryId}) = ${opts.categoryIds.length}`);
    filteredIds = Array.from(new Set(matchingUcIds.map(r => r.useCaseId)));
    if (filteredIds.length === 0) return { items: [], total: 0 };
    conditions.push(inArray(useCases.id, filteredIds));
  }

  const whereClause = and(...conditions);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(useCases)
    .where(whereClause);
  const total = countResult[0]?.count ?? 0;

  // For score sorting, we need to join with the latest AI score at the SQL level
  // so that ORDER BY + LIMIT/OFFSET produces globally correct pagination.
  let rows: UseCase[];
  if (opts.sort === "score") {
    // Use a raw query that LEFT JOINs the latest score per use case.
    // NOTE: We use the full table name `use_cases` (not an alias) because Drizzle's
    // whereClause interpolates column refs as `use_cases`.`column`.
    const rawRows = await db.execute(
      sql`SELECT use_cases.*, COALESCE(ls.overallScore, '0') as _sortScore
          FROM use_cases
          LEFT JOIN (
            SELECT useCaseId, overallScore
            FROM ai_scores a1
            WHERE a1.scannedAt = (
              SELECT MAX(a2.scannedAt) FROM ai_scores a2 WHERE a2.useCaseId = a1.useCaseId
            )
          ) ls ON ls.useCaseId = use_cases.id
          WHERE ${whereClause}
          ORDER BY CAST(COALESCE(ls.overallScore, '0') AS DECIMAL(3,1)) DESC, use_cases.createdAt DESC
          LIMIT ${opts.limit ?? 20}
          OFFSET ${opts.offset ?? 0}`
    );
    // Map raw rows back to UseCase shape
    rows = (rawRows[0] as unknown as any[]).map((r: any) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      sessionReplayUrl: r.sessionReplayUrl,
      deliverableUrl: r.deliverableUrl,
      status: r.status,
      isHighlight: !!r.isHighlight,
      language: r.language,
      rejectionReason: r.rejectionReason,
      consentToContact: !!r.consentToContact,
      viewCount: r.viewCount,
      upvoteCount: r.upvoteCount,
      submitterId: r.submitterId,
      createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt),
      approvedAt: r.approvedAt ? (r.approvedAt instanceof Date ? r.approvedAt : new Date(r.approvedAt)) : null,
      aiSummary: r.aiSummary,
    }));
  } else {
    let orderBy;
    switch (opts.sort) {
      case "popular": orderBy = desc(useCases.upvoteCount); break;
      case "views": orderBy = desc(useCases.viewCount); break;
      case "newest": default: orderBy = desc(useCases.createdAt); break;
    }
    rows = await db
      .select()
      .from(useCases)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(opts.limit ?? 20)
      .offset(opts.offset ?? 0);
  }

  if (rows.length === 0) return { items: [], total };

  const ucIds = rows.map(r => r.id);

  // Fetch submitter names + profile usernames
  const submitterIds = Array.from(new Set(rows.map(r => r.submitterId)));
  const submitters = submitterIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, submitterIds))
    : [];
  const submitterMap = new Map(submitters.map(s => [s.id, s.name]));
  const profileRows = submitterIds.length > 0
    ? await db.select({ userId: userProfiles.userId, username: userProfiles.username, avatarUrl: userProfiles.avatarUrl }).from(userProfiles).where(inArray(userProfiles.userId, submitterIds))
    : [];
  const profileUsernameMap = new Map(profileRows.map(p => [p.userId, p.username]));
  const profileAvatarMap = new Map(profileRows.map(p => [p.userId, p.avatarUrl]));

  // Fetch categories
  const ucCats = await db
    .select({ useCaseId: useCaseCategories.useCaseId, categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(inArray(useCaseCategories.useCaseId, ucIds));
  const catMap = new Map<number, { id: number; name: string; slug: string; type: string }[]>();
  for (const c of ucCats) { if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []); catMap.get(c.useCaseId)!.push({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type }); }

  // Fetch screenshots
  const screenshotRows = await db.select().from(screenshots).where(inArray(screenshots.useCaseId, ucIds)).orderBy(asc(screenshots.sortOrder));
  const ssMap = new Map<number, { id: number; url: string; blurhash?: string | null; sortOrder: number }[]>();
  for (const s of screenshotRows) { if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, []); ssMap.get(s.useCaseId)!.push({ id: s.id, url: s.url, blurhash: s.blurhash, sortOrder: s.sortOrder }); }

  // Fetch user upvotes
   let upvoteSet = new Set<number>();
   if (opts.userId) {
     const userUpvotes = await db
       .select({ useCaseId: upvotes.useCaseId })
       .from(upvotes)
       .where(and(inArray(upvotes.useCaseId, ucIds), eq(upvotes.userId, opts.userId)));
     upvoteSet = new Set(userUpvotes.map(u => u.useCaseId));
   }

  // Fetch AI scores (always, for badge display + optional sorting)
  const aiScoreRows = ucIds.length > 0
    ? await db.select().from(aiScores).where(inArray(aiScores.useCaseId, ucIds)).orderBy(desc(aiScores.scannedAt))
    : [];
  const aiScoreMap = new Map<number, { overall: string; completeness: string; innovativeness: string; impact: string; complexity: string; presentation: string; reasoning: string | null }>();
  const scoreNumMap = new Map<number, number>();
  for (const s of aiScoreRows) {
    if (!aiScoreMap.has(s.useCaseId)) {
      aiScoreMap.set(s.useCaseId, {
        overall: s.overallScore, completeness: s.completenessScore, innovativeness: s.innovativenessScore,
        impact: s.impactScore, complexity: s.complexityScore, presentation: s.presentationScore, reasoning: s.reasoning,
      });
      scoreNumMap.set(s.useCaseId, parseFloat(s.overallScore));
    }
  }

  const items: UseCaseWithDetails[] = rows.map(uc => ({
    ...uc,
    submitterName: submitterMap.get(uc.submitterId) ?? null,
    submitterUsername: profileUsernameMap.get(uc.submitterId) ?? null,
    submitterAvatar: profileAvatarMap.get(uc.submitterId) ?? null,
    categories: catMap.get(uc.id) ?? [],
    screenshots: ssMap.get(uc.id) ?? [],
    hasUpvoted: opts.userId ? upvoteSet.has(uc.id) : undefined,
    aiScore: aiScoreMap.get(uc.id) ?? null,
  }));

  return { items, total };
}

/** Look up a use case by session replay URL — returns id, slug, title */
export async function getUseCaseBySessionUrl(sessionUrl: string): Promise<{ id: number; slug: string; title: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ id: useCases.id, slug: useCases.slug, title: useCases.title })
    .from(useCases)
    .where(eq(useCases.sessionReplayUrl, sessionUrl))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

/** Check if a session replay URL (or its base share ID) already exists in the database.
 * Normalizes the URL by extracting the share ID and checking both exact and variant matches.
 * Returns the existing use case info if found, null otherwise. */
export async function checkDuplicateSessionUrl(sessionUrl: string): Promise<{ id: number; slug: string; title: string; status: string } | null> {
  const db = await getDb();
  if (!db) return null;

  // First try exact match
  const exact = await db.select({ id: useCases.id, slug: useCases.slug, title: useCases.title, status: useCases.status })
    .from(useCases)
    .where(eq(useCases.sessionReplayUrl, sessionUrl))
    .limit(1);
  if (exact.length > 0) return exact[0];

  // Extract base share ID from URL and check variants
  // Handles: https://manus.im/share/ABC123, https://manus.im/share/ABC123?replay=1
  // Also handles: https://xxx.manus.space/...
  let baseShareId: string | null = null;
  try {
    const url = new URL(sessionUrl);
    if (url.hostname === 'manus.im' && url.pathname.startsWith('/share/')) {
      baseShareId = url.pathname.split('/share/')[1]?.split('?')[0]?.split('/')[0] || null;
    }
  } catch { /* not a valid URL, skip variant matching */ }

  if (baseShareId) {
    // Check for any URL containing this share ID
    const variant = await db.select({ id: useCases.id, slug: useCases.slug, title: useCases.title, status: useCases.status })
      .from(useCases)
      .where(like(useCases.sessionReplayUrl, `%${baseShareId}%`))
      .limit(1);
    if (variant.length > 0) return variant[0];
  }

  return null;
}

/** Lightweight fetch for OG meta injection — does NOT increment view count or log view events */
export async function getUseCaseMetaBySlug(slug: string): Promise<{ title: string; description: string; screenshots: { url: string }[] } | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(useCases).where(eq(useCases.slug, slug)).limit(1);
  if (rows.length === 0) return null;
  const uc = rows[0];

  const screenshotRows = await db.select({ url: screenshots.url }).from(screenshots).where(eq(screenshots.useCaseId, uc.id)).orderBy(asc(screenshots.sortOrder)).limit(1);

  return {
    title: uc.title,
    description: uc.description ?? '',
    screenshots: screenshotRows,
  };
}

export async function getUseCaseBySlug(slug: string, userId?: number): Promise<UseCaseWithDetails | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(useCases).where(eq(useCases.slug, slug)).limit(1);
  if (rows.length === 0) return null;
  const uc = rows[0];

  // Increment cumulative counter AND log a discrete view event
  await db.update(useCases).set({ viewCount: sql`${useCases.viewCount} + 1` }).where(eq(useCases.id, uc.id));
  await db.insert(viewEvents).values({ useCaseId: uc.id, visitorKey: null });

  const submitterRows = await db.select({ name: users.name }).from(users).where(eq(users.id, uc.submitterId)).limit(1);
  const submitterProfileRows = await db.select({ username: userProfiles.username, avatarUrl: userProfiles.avatarUrl }).from(userProfiles).where(eq(userProfiles.userId, uc.submitterId)).limit(1);

  const ucCats = await db
    .select({ categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(eq(useCaseCategories.useCaseId, uc.id));

  const screenshotRows = await db.select().from(screenshots).where(eq(screenshots.useCaseId, uc.id)).orderBy(asc(screenshots.sortOrder));

  let hasUpvoted = false;
  if (userId) {
    const upvoteRow = await db.select().from(upvotes).where(and(eq(upvotes.useCaseId, uc.id), eq(upvotes.userId, userId))).limit(1);
    hasUpvoted = upvoteRow.length > 0;
  }

  // Fetch AI score
  const aiScoreRows = await db.select().from(aiScores).where(eq(aiScores.useCaseId, uc.id)).orderBy(desc(aiScores.scannedAt)).limit(1);
  const aiScoreData = aiScoreRows.length > 0 ? {
    overall: aiScoreRows[0].overallScore,
    completeness: aiScoreRows[0].completenessScore,
    innovativeness: aiScoreRows[0].innovativenessScore,
    impact: aiScoreRows[0].impactScore,
    complexity: aiScoreRows[0].complexityScore,
    presentation: aiScoreRows[0].presentationScore,
    reasoning: aiScoreRows[0].reasoning,
  } : null;

  return {
    ...uc,
    viewCount: uc.viewCount + 1,
    submitterName: submitterRows[0]?.name ?? null,
    submitterUsername: submitterProfileRows[0]?.username ?? null,
    submitterAvatar: submitterProfileRows[0]?.avatarUrl ?? null,
    categories: ucCats.map(c => ({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type })),
    screenshots: screenshotRows.map(s => ({ id: s.id, url: s.url, sortOrder: s.sortOrder })),
    hasUpvoted,
    aiScore: aiScoreData,
  };
}

export async function getRelatedUseCases(useCaseId: number, categoryIds: number[], limit = 4): Promise<UseCaseWithDetails[]> {
  const db = await getDb();
  if (!db || categoryIds.length === 0) return [];

  const relatedIds = await db
    .select({ useCaseId: useCaseCategories.useCaseId })
    .from(useCaseCategories)
    .where(and(
      inArray(useCaseCategories.categoryId, categoryIds),
      sql`${useCaseCategories.useCaseId} != ${useCaseId}`
    ));

  const uniqueIds = Array.from(new Set(relatedIds.map(r => r.useCaseId)));
  if (uniqueIds.length === 0) return [];

  // Fetch all candidate rows (approved, sharing categories, excluding current)
  const candidateRows = await db
    .select()
    .from(useCases)
    .where(and(inArray(useCases.id, uniqueIds), eq(useCases.status, "approved")));

  if (candidateRows.length === 0) return [];

  const candidateIds = candidateRows.map(r => r.id);

  // Fetch AI scores for all candidates to sort by top-rated
  const scoreRows = await db.select().from(aiScores).where(inArray(aiScores.useCaseId, candidateIds)).orderBy(desc(aiScores.scannedAt));
  const scoreMap = new Map<number, { overall: string; completeness: string; innovativeness: string; impact: string; complexity: string; presentation: string; reasoning: string | null }>();
  const scoreNumMap = new Map<number, number>();
  for (const s of scoreRows) {
    if (!scoreMap.has(s.useCaseId)) {
      scoreMap.set(s.useCaseId, {
        overall: s.overallScore, completeness: s.completenessScore, innovativeness: s.innovativenessScore,
        impact: s.impactScore, complexity: s.complexityScore, presentation: s.presentationScore, reasoning: s.reasoning,
      });
      scoreNumMap.set(s.useCaseId, parseFloat(s.overallScore));
    }
  }

  // Sort candidates by AI score descending, then by upvote count as tiebreaker
  const sorted = candidateRows.sort((a, b) => {
    const scoreA = scoreNumMap.get(a.id) ?? 0;
    const scoreB = scoreNumMap.get(b.id) ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0);
  });

  const rows = sorted.slice(0, limit);
  const ucIds = rows.map(r => r.id);
  const submitterIds = Array.from(new Set(rows.map(r => r.submitterId)));
  const submitters = submitterIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, submitterIds))
    : [];
  const submitterMap = new Map(submitters.map(s => [s.id, s.name]));

  const ucCats = await db
    .select({ useCaseId: useCaseCategories.useCaseId, categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(inArray(useCaseCategories.useCaseId, ucIds));
  const catMap = new Map<number, { id: number; name: string; slug: string; type: string }[]>();
  for (const c of ucCats) { if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []); catMap.get(c.useCaseId)!.push({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type }); }

  const screenshotRows = await db.select().from(screenshots).where(inArray(screenshots.useCaseId, ucIds)).orderBy(asc(screenshots.sortOrder));
  const ssMap = new Map<number, { id: number; url: string; sortOrder: number }[]>();
  for (const s of screenshotRows) { if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, []); ssMap.get(s.useCaseId)!.push({ id: s.id, url: s.url, sortOrder: s.sortOrder }); }

  return rows.map(uc => ({
    ...uc,
    submitterName: submitterMap.get(uc.submitterId) ?? null,
    submitterUsername: null,
    submitterAvatar: null,
    categories: catMap.get(uc.id) ?? [],
    screenshots: ssMap.get(uc.id) ?? [],
    aiScore: scoreMap.get(uc.id) ?? null,
  }));
}

// ─── Trending Helpers ───────────────────────────────────────────────

/** Get trending use cases — approved use cases with the most upvotes in the last 7 days */
export async function getTrendingUseCases(limit = 6): Promise<UseCaseWithDetails[]> {
  const db = await getDb();
  if (!db) return [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get use case IDs with most recent upvotes
  const trendingIds = await db
    .select({
      useCaseId: upvotes.useCaseId,
      recentUpvotes: sql<number>`count(*)`,
    })
    .from(upvotes)
    .where(sql`${upvotes.createdAt} >= ${sevenDaysAgo}`)
    .groupBy(upvotes.useCaseId)
    .orderBy(sql`count(*) DESC`)
    .limit(limit * 2);

  if (trendingIds.length === 0) {
    // Fallback: return most popular approved use cases
    const rows = await db.select().from(useCases)
      .where(eq(useCases.status, "approved"))
      .orderBy(desc(useCases.upvoteCount))
      .limit(limit);
    if (rows.length === 0) return [];
    const ucIds = rows.map(r => r.id);
    const submitterIds = Array.from(new Set(rows.map(r => r.submitterId)));
    const submitters = submitterIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, submitterIds))
      : [];
    const submitterMap = new Map(submitters.map(s => [s.id, s.name]));
    const ucCats = await db
      .select({ useCaseId: useCaseCategories.useCaseId, categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
      .from(useCaseCategories)
      .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
      .where(inArray(useCaseCategories.useCaseId, ucIds));
    const catMap = new Map<number, { id: number; name: string; slug: string; type: string }[]>();
    for (const c of ucCats) { if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []); catMap.get(c.useCaseId)!.push({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type }); }
    const screenshotRows = await db.select().from(screenshots).where(inArray(screenshots.useCaseId, ucIds)).orderBy(asc(screenshots.sortOrder));
    const ssMap = new Map<number, { id: number; url: string; sortOrder: number }[]>();
    for (const s of screenshotRows) { if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, []); ssMap.get(s.useCaseId)!.push({ id: s.id, url: s.url, sortOrder: s.sortOrder }); }
    const fbScoreRows = await db.select().from(aiScores).where(inArray(aiScores.useCaseId, ucIds)).orderBy(desc(aiScores.scannedAt));
    const fbScoreMap = new Map<number, { overall: string; completeness: string; innovativeness: string; impact: string; complexity: string; presentation: string; reasoning: string | null }>();
    for (const s of fbScoreRows) { if (!fbScoreMap.has(s.useCaseId)) fbScoreMap.set(s.useCaseId, { overall: s.overallScore, completeness: s.completenessScore, innovativeness: s.innovativenessScore, impact: s.impactScore, complexity: s.complexityScore, presentation: s.presentationScore, reasoning: s.reasoning }); }
    return rows.map(uc => ({
      ...uc,
      submitterName: submitterMap.get(uc.submitterId) ?? null,
      submitterUsername: null,
      submitterAvatar: null,
      categories: catMap.get(uc.id) ?? [],
      screenshots: ssMap.get(uc.id) ?? [],
      hasUpvoted: false,
      aiScore: fbScoreMap.get(uc.id) ?? null,
    }));
  }

  // Main path: we have trending IDs
  const candidateIds = trendingIds.map(r => r.useCaseId);
  const rows = await db.select().from(useCases)
    .where(and(inArray(useCases.id, candidateIds), eq(useCases.status, "approved")))
    .limit(limit);
  if (rows.length === 0) return [];

  const ucIds = rows.map(r => r.id);
  const submitterIds = Array.from(new Set(rows.map(r => r.submitterId)));
  const submitters = submitterIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, submitterIds))
    : [];
  const submitterMap = new Map(submitters.map(s => [s.id, s.name]));
  const ucCats = await db
    .select({ useCaseId: useCaseCategories.useCaseId, categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(inArray(useCaseCategories.useCaseId, ucIds));
  const catMap = new Map<number, { id: number; name: string; slug: string; type: string }[]>();
  for (const c of ucCats) { if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []); catMap.get(c.useCaseId)!.push({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type }); }
  const screenshotRows = await db.select().from(screenshots).where(inArray(screenshots.useCaseId, ucIds)).orderBy(asc(screenshots.sortOrder));
  const ssMap = new Map<number, { id: number; url: string; sortOrder: number }[]>();
  for (const s of screenshotRows) { if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, []); ssMap.get(s.useCaseId)!.push({ id: s.id, url: s.url, sortOrder: s.sortOrder }); }
  const trScoreRows = await db.select().from(aiScores).where(inArray(aiScores.useCaseId, ucIds)).orderBy(desc(aiScores.scannedAt));
  const trScoreMap = new Map<number, { overall: string; completeness: string; innovativeness: string; impact: string; complexity: string; presentation: string; reasoning: string | null }>();
  for (const s of trScoreRows) { if (!trScoreMap.has(s.useCaseId)) trScoreMap.set(s.useCaseId, { overall: s.overallScore, completeness: s.completenessScore, innovativeness: s.innovativenessScore, impact: s.impactScore, complexity: s.complexityScore, presentation: s.presentationScore, reasoning: s.reasoning }); }

  // Sort by recent upvote count
  const trendingMap = new Map(trendingIds.map(r => [r.useCaseId, r.recentUpvotes]));
  return rows
    .map(uc => ({
      ...uc,
      submitterName: submitterMap.get(uc.submitterId) ?? null,
      submitterUsername: null,
      submitterAvatar: null,
      categories: catMap.get(uc.id) ?? [],
      screenshots: ssMap.get(uc.id) ?? [],
      recentUpvotes: trendingMap.get(uc.id) ?? 0,
      aiScore: trScoreMap.get(uc.id) ?? null,
    }))
    .sort((a, b) => (b.recentUpvotes as number) - (a.recentUpvotes as number));
}

// ─── Submission Helpers ──────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 200) + "-" + Date.now().toString(36);
}

export async function createUseCase(data: {
  title: string;
  description: string;
  sessionReplayUrl?: string;
  deliverableUrl?: string;
  language: string;
  consentToContact: boolean;
  submitterId: number;
  categoryIds: number[];
  screenshotData: { url: string; fileKey: string }[];
}): Promise<UseCase> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const slug = generateSlug(data.title);

  const result = await db.insert(useCases).values({
    title: data.title,
    slug,
    description: data.description,
    sessionReplayUrl: data.sessionReplayUrl || null,
    deliverableUrl: data.deliverableUrl || null,
    language: data.language,
    consentToContact: data.consentToContact,
    submitterId: data.submitterId,
    status: "pending",
  });

  const insertId = result[0].insertId;

  if (data.categoryIds.length > 0) {
    await db.insert(useCaseCategories).values(
      data.categoryIds.map(catId => ({ useCaseId: insertId, categoryId: catId }))
    );
  }

  if (data.screenshotData.length > 0) {
    await db.insert(screenshots).values(
      data.screenshotData.map((s, i) => ({ useCaseId: insertId, url: s.url, fileKey: s.fileKey, sortOrder: i }))
    );
  }

  const created = await db.select().from(useCases).where(eq(useCases.id, insertId)).limit(1);
  return created[0];
}

// ─── Upvote Helpers (user-based, login required) ────────────────────

export async function toggleUpvote(useCaseId: number, userId: number): Promise<{ upvoted: boolean; newCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(upvotes).where(and(eq(upvotes.useCaseId, useCaseId), eq(upvotes.userId, userId))).limit(1);

  if (existing.length > 0) {
    await db.delete(upvotes).where(and(eq(upvotes.useCaseId, useCaseId), eq(upvotes.userId, userId)));
    await db.update(useCases).set({ upvoteCount: sql`GREATEST(${useCases.upvoteCount} - 1, 0)` }).where(eq(useCases.id, useCaseId));
    const updated = await db.select({ upvoteCount: useCases.upvoteCount }).from(useCases).where(eq(useCases.id, useCaseId)).limit(1);
    return { upvoted: false, newCount: updated[0]?.upvoteCount ?? 0 };
  } else {
    await db.insert(upvotes).values({ useCaseId, userId });
    await db.update(useCases).set({ upvoteCount: sql`${useCases.upvoteCount} + 1` }).where(eq(useCases.id, useCaseId));
    const updated = await db.select({ upvoteCount: useCases.upvoteCount }).from(useCases).where(eq(useCases.id, useCaseId)).limit(1);
    return { upvoted: true, newCount: updated[0]?.upvoteCount ?? 0 };
  }
}

// ─── Submitter Notification Helpers ─────────────────────────────────

export async function createSubmitterNotification(data: {
  useCaseId: number;
  userId: number;
  type: "approved" | "rejected";
  message: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(submitterNotifications).values(data);
}

export async function getSubmitterNotifications(userId: number): Promise<(SubmitterNotification & { useCaseTitle: string })[]> {
  const db = await getDb();
  if (!db) return [];

  const notifs = await db.select().from(submitterNotifications).where(eq(submitterNotifications.userId, userId)).orderBy(desc(submitterNotifications.createdAt));
  if (notifs.length === 0) return [];

  const ucIds = Array.from(new Set(notifs.map(n => n.useCaseId)));
  const ucRows = await db.select({ id: useCases.id, title: useCases.title }).from(useCases).where(inArray(useCases.id, ucIds));
  const ucMap = new Map(ucRows.map(u => [u.id, u.title]));

  return notifs.map(n => ({
    ...n,
    useCaseTitle: ucMap.get(n.useCaseId) ?? "Unknown",
  }));
}

export async function markNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(submitterNotifications).set({ isRead: true }).where(eq(submitterNotifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(submitterNotifications).where(and(eq(submitterNotifications.userId, userId), eq(submitterNotifications.isRead, false)));
  return result[0]?.count ?? 0;
}

// ─── My Submissions ─────────────────────────────────────────────────

export async function getUserSubmissions(userId: number): Promise<(UseCase & { categories: { id: number; name: string; slug: string; type: string }[] })[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select().from(useCases).where(eq(useCases.submitterId, userId)).orderBy(desc(useCases.createdAt));
  if (rows.length === 0) return [];

  const ucIds = rows.map(r => r.id);
  const ucCats = await db
    .select({ useCaseId: useCaseCategories.useCaseId, categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(inArray(useCaseCategories.useCaseId, ucIds));
  const catMap = new Map<number, { id: number; name: string; slug: string; type: string }[]>();
  for (const c of ucCats) { if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []); catMap.get(c.useCaseId)!.push({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type }); }

  return rows.map(uc => ({ ...uc, categories: catMap.get(uc.id) ?? [] }));
}

// ─── Admin Helpers ───────────────────────────────────────────────────

export async function getAdminUseCases(opts: {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
  offset?: number;
}): Promise<{ items: (UseCase & { submitterName: string | null; submitterEmail: string | null; categories: { id: number; name: string; slug: string; type: string }[]; screenshots: { id: number; url: string; sortOrder: number }[]; aiScore?: { overall: string; completeness: string; innovativeness: string; impact: string; complexity: string; presentation: string; reasoning: string | null } | null })[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts.status) conditions.push(eq(useCases.status, opts.status));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(useCases).where(whereClause);
  const total = countResult[0]?.count ?? 0;

  const rows = await db.select().from(useCases).where(whereClause).orderBy(desc(useCases.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
  if (rows.length === 0) return { items: [], total };

  const ucIds = rows.map(r => r.id);
  const submitterIds = Array.from(new Set(rows.map(r => r.submitterId)));
  const submitters = submitterIds.length > 0
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, submitterIds))
    : [];
  const submitterMap = new Map(submitters.map(s => [s.id, { name: s.name, email: s.email }]));

  const ucCats = await db
    .select({ useCaseId: useCaseCategories.useCaseId, categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(inArray(useCaseCategories.useCaseId, ucIds));
  const catMap = new Map<number, { id: number; name: string; slug: string; type: string }[]>();
  for (const c of ucCats) { if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []); catMap.get(c.useCaseId)!.push({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type }); }

  const screenshotRows = await db.select().from(screenshots).where(inArray(screenshots.useCaseId, ucIds)).orderBy(asc(screenshots.sortOrder));
  const ssMap = new Map<number, { id: number; url: string; sortOrder: number }[]>();
  for (const s of screenshotRows) { if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, []); ssMap.get(s.useCaseId)!.push({ id: s.id, url: s.url, sortOrder: s.sortOrder }); }

  // Fetch AI scores
  const aiScoreRows = await db.select().from(aiScores).where(inArray(aiScores.useCaseId, ucIds)).orderBy(desc(aiScores.scannedAt));
  const aiScoreMap = new Map<number, { overall: string; completeness: string; innovativeness: string; impact: string; complexity: string; presentation: string; reasoning: string | null }>();
  for (const s of aiScoreRows) {
    // Keep the latest score per use case
    if (!aiScoreMap.has(s.useCaseId)) {
      aiScoreMap.set(s.useCaseId, {
        overall: s.overallScore,
        completeness: s.completenessScore,
        innovativeness: s.innovativenessScore,
        impact: s.impactScore,
        complexity: s.complexityScore,
        presentation: s.presentationScore,
        reasoning: s.reasoning,
      });
    }
  }

  const items = rows.map(uc => ({
    ...uc,
    submitterName: submitterMap.get(uc.submitterId)?.name ?? null,
    submitterEmail: submitterMap.get(uc.submitterId)?.email ?? null,
    categories: catMap.get(uc.id) ?? [],
    screenshots: ssMap.get(uc.id) ?? [],
    aiScore: aiScoreMap.get(uc.id) ?? null,
  }));

  return { items, total };
}

export async function approveUseCase(id: number, data: {
  categoryIds: number[];
  isHighlight: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(useCases).set({
    status: "approved",
    isHighlight: data.isHighlight,
    approvedAt: new Date(),
  }).where(eq(useCases.id, id));

  await db.delete(useCaseCategories).where(eq(useCaseCategories.useCaseId, id));
  if (data.categoryIds.length > 0) {
    await db.insert(useCaseCategories).values(
      data.categoryIds.map(catId => ({ useCaseId: id, categoryId: catId }))
    );
  }
}

export async function rejectUseCase(id: number, reason: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(useCases).set({ status: "rejected", rejectionReason: reason }).where(eq(useCases.id, id));
}

export async function updateUseCaseAdmin(id: number, data: {
  title?: string;
  description?: string;
  categoryIds?: number[];
  isHighlight?: boolean;
  status?: "pending" | "approved" | "rejected";
  sessionReplayUrl?: string;
  deliverableUrl?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateFields: Record<string, unknown> = {};
  if (data.title !== undefined) updateFields.title = data.title;
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.isHighlight !== undefined) updateFields.isHighlight = data.isHighlight;
  if (data.status !== undefined) updateFields.status = data.status;
  if (data.sessionReplayUrl !== undefined) updateFields.sessionReplayUrl = data.sessionReplayUrl;
  if (data.deliverableUrl !== undefined) updateFields.deliverableUrl = data.deliverableUrl;

  if (Object.keys(updateFields).length > 0) {
    await db.update(useCases).set(updateFields).where(eq(useCases.id, id));
  }

  if (data.categoryIds !== undefined) {
    await db.delete(useCaseCategories).where(eq(useCaseCategories.useCaseId, id));
    if (data.categoryIds.length > 0) {
      await db.insert(useCaseCategories).values(
        data.categoryIds.map(catId => ({ useCaseId: id, categoryId: catId }))
      );
    }
  }
}

// ─── Admin Activity Log ─────────────────────────────────────────────

export async function logAdminAction(data: {
  adminId: number;
  action: string;
  targetType: string;
  targetId: number;
  details?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminActivityLog).values({
    adminId: data.adminId,
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId,
    details: data.details ?? null,
  });
}

export async function getAdminActivityLog(opts: {
  limit?: number;
  offset?: number;
  adminId?: number;
  action?: string;
}): Promise<{ items: (AdminActivityLog & { adminName: string | null })[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [];
  if (opts.adminId) conditions.push(eq(adminActivityLog.adminId, opts.adminId));
  if (opts.action) conditions.push(eq(adminActivityLog.action, opts.action));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(adminActivityLog).where(whereClause);
  const total = countResult[0]?.count ?? 0;

  const rows = await db.select().from(adminActivityLog).where(whereClause).orderBy(desc(adminActivityLog.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
  if (rows.length === 0) return { items: [], total };

  const adminIds = Array.from(new Set(rows.map(r => r.adminId)));
  const admins = adminIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, adminIds))
    : [];
  const adminMap = new Map(admins.map(a => [a.id, a.name]));

  return {
    items: rows.map(r => ({ ...r, adminName: adminMap.get(r.adminId) ?? null })),
    total,
  };
}

// ─── AI Scoring ─────────────────────────────────────────────────────

export async function saveAiScore(data: {
  useCaseId: number;
  completenessScore: string;
  innovativenessScore: string;
  impactScore: string;
  complexityScore: string;
  presentationScore: string;
  overallScore: string;
  reasoning: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(aiScores).values(data);
}

export async function getAiScore(useCaseId: number): Promise<AiScore | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(aiScores).where(eq(aiScores.useCaseId, useCaseId)).orderBy(desc(aiScores.scannedAt)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

export async function updateAiScore(useCaseId: number, data: {
  completenessScore: string;
  innovativenessScore: string;
  impactScore: string;
  complexityScore: string;
  presentationScore: string;
  overallScore: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Update the latest score record for this use case
  const existing = await db.select().from(aiScores).where(eq(aiScores.useCaseId, useCaseId)).orderBy(desc(aiScores.scannedAt)).limit(1);
  if (existing.length > 0) {
    await db.update(aiScores).set({
      ...data,
      scannedAt: new Date(),
    }).where(eq(aiScores.id, existing[0].id));
  } else {
    // Create a new score record if none exists
    await db.insert(aiScores).values({
      useCaseId,
      ...data,
      reasoning: "Manually set by admin",
    });
  }
}

export async function getAverageScoresForUser(userId: number): Promise<{
  completeness: number;
  innovativeness: number;
  impact: number;
  complexity: number;
  presentation: number;
  overall: number;
  count: number;
} | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      completeness: sql<number>`AVG(CAST(${aiScores.completenessScore} AS DECIMAL(3,1)))`,
      innovativeness: sql<number>`AVG(CAST(${aiScores.innovativenessScore} AS DECIMAL(3,1)))`,
      impact: sql<number>`AVG(CAST(${aiScores.impactScore} AS DECIMAL(3,1)))`,
      complexity: sql<number>`AVG(CAST(${aiScores.complexityScore} AS DECIMAL(3,1)))`,
      presentation: sql<number>`AVG(CAST(${aiScores.presentationScore} AS DECIMAL(3,1)))`,
      overall: sql<number>`AVG(CAST(${aiScores.overallScore} AS DECIMAL(3,1)))`,
      count: sql<number>`COUNT(DISTINCT ${aiScores.useCaseId})`,
    })
    .from(aiScores)
    .innerJoin(useCases, eq(aiScores.useCaseId, useCases.id))
    .where(and(eq(useCases.submitterId, userId), eq(useCases.status, "approved")));
  if (rows.length === 0 || rows[0].count === 0) return null;
  return rows[0];
}

// ─── Admin Stats ─────────────────────────────────────────────────────

export async function getTopCategories(limit = 10): Promise<{ id: number; name: string; slug: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      count: sql<number>`count(${useCaseCategories.useCaseId})`,
    })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .innerJoin(useCases, and(eq(useCaseCategories.useCaseId, useCases.id), eq(useCases.status, "approved")))
    .groupBy(categories.id, categories.name, categories.slug)
    .orderBy(sql`count(${useCaseCategories.useCaseId}) DESC`)
    .limit(limit);

  return rows;
}

export async function getSubmissionTrends(days = 30): Promise<{ date: string; submissions: number; approvals: number; rejections: number }[]> {
  const db = await getDb();
  if (!db) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db.select({
    date: sql<string>`DATE(createdAt)`,
    submissions: sql<number>`count(*)`,
    approvals: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
    rejections: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
  }).from(useCases).where(gte(useCases.createdAt, since)).groupBy(sql`DATE(createdAt)`).orderBy(sql`DATE(createdAt)`);

  return rows.map(r => ({
    date: String(r.date),
    submissions: r.submissions ?? 0,
    approvals: r.approvals ?? 0,
    rejections: r.rejections ?? 0,
  }));
}

export async function getAdminStats(): Promise<{
  totalSubmissions: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalUpvotes: number;
  totalViews: number;
  topCategories: { id: number; name: string; slug: string; count: number }[];
}> {
  const db = await getDb();
  if (!db) return { totalSubmissions: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0, totalUpvotes: 0, totalViews: 0, topCategories: [] };

  const stats = await db.select({
    total: sql<number>`count(*)`,
    pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
    approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
    rejected: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
    totalUpvotes: sql<number>`SUM(upvoteCount)`,
    totalViews: sql<number>`SUM(viewCount)`,
  }).from(useCases);

  const s = stats[0];
  return {
    totalSubmissions: s?.total ?? 0,
    pendingCount: s?.pending ?? 0,
    approvedCount: s?.approved ?? 0,
    rejectedCount: s?.rejected ?? 0,
    totalUpvotes: s?.totalUpvotes ?? 0,
    totalViews: s?.totalViews ?? 0,
    topCategories: await getTopCategories(),
  };
}

// ─── Upvote Trends ──────────────────────────────────────────────────

export async function getUpvoteTrends(days = 30): Promise<{ date: string; upvotes: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows: any[] = await db.execute(sql`
    SELECT DATE(createdAt) as date, COUNT(*) as upvotes
    FROM upvotes
    WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    GROUP BY DATE(createdAt)
    ORDER BY date ASC
  `);
  const result = (rows as any)?.[0] ?? rows;
  const map = new Map<string, number>();
  for (const r of (Array.isArray(result) ? result : [])) {
    const d = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
    map.set(d, Number(r.upvotes));
  }
  // Fill in missing days with 0
  const output: { date: string; upvotes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    output.push({ date: key, upvotes: map.get(key) ?? 0 });
  }
  return output;
}

// ─── View Trends ────────────────────────────────────────────────────

export async function getViewTrends(days = 30): Promise<{ date: string; views: number }[]> {
  const db = await getDb();
  if (!db) return [];
  // Use the view_events table for accurate per-day view counts
  const rows: any[] = await db.execute(sql`
    SELECT DATE(createdAt) as date, COUNT(*) as views
    FROM view_events
    WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    GROUP BY DATE(createdAt)
    ORDER BY date ASC
  `);
  const result = (rows as any)?.[0] ?? rows;
  const map = new Map<string, number>();
  for (const r of (Array.isArray(result) ? result : [])) {
    const d = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
    map.set(d, Number(r.views));
  }
  const output: { date: string; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    output.push({ date: key, views: map.get(key) ?? 0 });
  }
  return output;
}

// ─── Traffic Summary ────────────────────────────────────────────────

export async function getTrafficSummary(): Promise<{
  totalViews: number;
  totalUpvotes: number;
  totalUseCases: number;
  totalContributors: number;
  viewsToday: number;
  upvotesToday: number;
}> {
  const db = await getDb();
  if (!db) return { totalViews: 0, totalUpvotes: 0, totalUseCases: 0, totalContributors: 0, viewsToday: 0, upvotesToday: 0 };

  const [viewsResult]: any = await db.execute(sql`
    SELECT COALESCE(SUM(viewCount), 0) as total FROM use_cases WHERE status = 'approved'
  `);
  const totalViews = Number((viewsResult as any)?.[0]?.total ?? 0);

  const [upvotesResult]: any = await db.execute(sql`
    SELECT COUNT(*) as total FROM upvotes
  `);
  const totalUpvotes = Number((upvotesResult as any)?.[0]?.total ?? 0);

  const [useCasesResult]: any = await db.execute(sql`
    SELECT COUNT(*) as total FROM use_cases WHERE status = 'approved'
  `);
  const totalUseCases = Number((useCasesResult as any)?.[0]?.total ?? 0);

  const [contributorsResult]: any = await db.execute(sql`
    SELECT COUNT(DISTINCT submitterId) as total FROM use_cases
  `);
  const totalContributors = Number((contributorsResult as any)?.[0]?.total ?? 0);

  const [viewsTodayResult]: any = await db.execute(sql`
    SELECT COUNT(*) as total FROM view_events WHERE DATE(createdAt) = CURDATE()
  `);
  const viewsToday = Number((viewsTodayResult as any)?.[0]?.total ?? 0);

  const [upvotesTodayResult]: any = await db.execute(sql`
    SELECT COUNT(*) as total FROM upvotes WHERE DATE(createdAt) = CURDATE()
  `);
  const upvotesToday = Number((upvotesTodayResult as any)?.[0]?.total ?? 0);

  return { totalViews, totalUpvotes, totalUseCases, totalContributors, viewsToday, upvotesToday };
}

// ─── Contributor Leaderboard ───────────────────────────────────────

export interface LeaderboardEntry {
  userId: number;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  approvedCount: number;
  totalUpvotes: number;
}

export async function getContributorLeaderboard(
  limit = 10,
  sortBy: "usecases" | "likes" = "usecases"
): Promise<LeaderboardEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const orderClause = sortBy === "likes"
    ? sql`ORDER BY totalUpvotes DESC, approvedCount DESC`
    : sql`ORDER BY approvedCount DESC, totalUpvotes DESC`;

  const rows: any[] = await db.execute(sql`
    SELECT
      u.id as userId,
      u.name,
      up.username,
      up.avatarUrl,
      COUNT(DISTINCT uc.id) as approvedCount,
      COALESCE(SUM(uc.upvoteCount), 0) as totalUpvotes
    FROM users u
    INNER JOIN use_cases uc ON uc.submitterId = u.id AND uc.status = 'approved'
    LEFT JOIN user_profiles up ON up.userId = u.id
    GROUP BY u.id, u.name, up.username, up.avatarUrl
    ${orderClause}
    LIMIT ${limit}
  `);

  const result = (rows as any)?.[0] ?? rows;
  return (Array.isArray(result) ? result : []).map((r: any) => ({
    userId: Number(r.userId),
    name: r.name ?? null,
    username: r.username ?? null,
    avatarUrl: r.avatarUrl ?? null,
    approvedCount: Number(r.approvedCount),
    totalUpvotes: Number(r.totalUpvotes),
  }));
}

// ─── Pending Use Cases Without AI Score ────────────────────────────

export async function getPendingWithoutAiScore(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const rows: any[] = await db.execute(sql`
    SELECT uc.id
    FROM use_cases uc
    LEFT JOIN ai_scores ai ON ai.useCaseId = uc.id
    WHERE uc.status = 'pending' AND ai.id IS NULL
    ORDER BY uc.createdAt ASC
  `);

  const result = (rows as any)?.[0] ?? rows;
  return (Array.isArray(result) ? result : []).map((r: any) => Number(r.id));
}

// ─── User Profile Helpers ──────────────────────────────────────────

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "manus", "system", "support", "help",
  "api", "www", "app", "profile", "profiles", "user", "users",
  "about", "submit", "login", "logout", "settings", "notifications",
]);

export function isUsernameValid(username: string): { valid: boolean; reason?: string } {
  if (username.length < 3) return { valid: false, reason: "Username must be at least 3 characters" };
  if (username.length > 32) return { valid: false, reason: "Username must be at most 32 characters" };
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return { valid: false, reason: "Username can only contain letters, numbers, hyphens, and underscores" };
  if (RESERVED_USERNAMES.has(username.toLowerCase())) return { valid: false, reason: "This username is reserved" };
  return { valid: true };
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: userProfiles.id }).from(userProfiles).where(eq(userProfiles.username, username)).limit(1);
  return rows.length > 0;
}

export async function getProfileByUserId(userId: number): Promise<(UserProfile & { socialHandles: UserSocialHandle[] }) | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (rows.length === 0) return null;
  const profile = rows[0];
  const handles = await db.select().from(userSocialHandles).where(eq(userSocialHandles.profileId, profile.id));
  return { ...profile, socialHandles: handles };
}

export async function getProfileByUsername(username: string): Promise<(UserProfile & {
  socialHandles: UserSocialHandle[];
  user: { id: number; name: string | null; email: string | null; createdAt: Date };
  stats: { approvedCount: number; totalUpvotes: number; totalViews: number };
  useCases: (UseCase & { categories: { id: number; name: string; slug: string; type: string }[]; screenshots: { id: number; url: string; sortOrder: number }[] })[];
}) | null> {
  const db = await getDb();
  if (!db) return null;

  const profileRows = await db.select().from(userProfiles).where(eq(userProfiles.username, username)).limit(1);
  if (profileRows.length === 0) return null;
  const profile = profileRows[0];

  const handles = await db.select().from(userSocialHandles).where(eq(userSocialHandles.profileId, profile.id));

  const userRows = await db.select({
    id: users.id, name: users.name, email: users.email, createdAt: users.createdAt,
  }).from(users).where(eq(users.id, profile.userId)).limit(1);
  const user = userRows[0] ?? { id: profile.userId, name: null, email: null, createdAt: new Date() };

  // Get approved use cases by this user
  const ucRows = await db.select().from(useCases)
    .where(and(eq(useCases.submitterId, profile.userId), eq(useCases.status, "approved")))
    .orderBy(desc(useCases.upvoteCount));

  let ucWithDetails: any[] = [];
  if (ucRows.length > 0) {
    const ucIds = ucRows.map(r => r.id);
    const ucCats = await db
      .select({ useCaseId: useCaseCategories.useCaseId, categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
      .from(useCaseCategories)
      .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
      .where(inArray(useCaseCategories.useCaseId, ucIds));
    const catMap = new Map<number, { id: number; name: string; slug: string; type: string }[]>();
    for (const c of ucCats) { if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []); catMap.get(c.useCaseId)!.push({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type }); }
    const screenshotRows = await db.select().from(screenshots).where(inArray(screenshots.useCaseId, ucIds)).orderBy(asc(screenshots.sortOrder));
    const ssMap = new Map<number, { id: number; url: string; sortOrder: number }[]>();
    for (const s of screenshotRows) { if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, []); ssMap.get(s.useCaseId)!.push({ id: s.id, url: s.url, sortOrder: s.sortOrder }); }
    ucWithDetails = ucRows.map(uc => ({
      ...uc,
      categories: catMap.get(uc.id) ?? [],
      screenshots: ssMap.get(uc.id) ?? [],
    }));
  }

  // Compute stats
  const totalUpvotes = ucRows.reduce((sum, uc) => sum + uc.upvoteCount, 0);
  const totalViews = ucRows.reduce((sum, uc) => sum + uc.viewCount, 0);

  return {
    ...profile,
    socialHandles: handles,
    user,
    stats: { approvedCount: ucRows.length, totalUpvotes, totalViews },
    useCases: ucWithDetails,
  };
}

export async function createProfile(data: {
  userId: number;
  username: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  company?: string;
  jobTitle?: string;
  bio?: string;
  socialHandles: { platform: "x" | "instagram" | "linkedin" | "other"; handle: string }[];
}): Promise<UserProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(userProfiles).values({
    userId: data.userId,
    username: data.username,
    proficiency: data.proficiency,
    company: data.company || null,
    jobTitle: data.jobTitle || null,
    bio: data.bio || null,
  });

  const profileId = result[0].insertId;

  if (data.socialHandles.length > 0) {
    await db.insert(userSocialHandles).values(
      data.socialHandles.map(h => ({ profileId, platform: h.platform, handle: h.handle }))
    );
  }

  const created = await db.select().from(userProfiles).where(eq(userProfiles.id, profileId)).limit(1);
  return created[0];
}

export async function updateProfile(userId: number, data: {
  username?: string;
  proficiency?: "beginner" | "intermediate" | "advanced" | "expert";
  company?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  socialHandles?: { platform: "x" | "instagram" | "linkedin" | "other"; handle: string }[];
}): Promise<UserProfile | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (existing.length === 0) return null;

  const profile = existing[0];
  const updates: Record<string, any> = {};
  if (data.username !== undefined && data.username !== profile.username) {
    updates.username = data.username;
    updates.usernameChangeCount = (profile.usernameChangeCount ?? 0) + 1;
  }
  if (data.proficiency !== undefined) updates.proficiency = data.proficiency;
  if (data.company !== undefined) updates.company = data.company;
  if (data.jobTitle !== undefined) updates.jobTitle = data.jobTitle;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;

  if (Object.keys(updates).length > 0) {
    await db.update(userProfiles).set(updates).where(eq(userProfiles.id, profile.id));
  }

  if (data.socialHandles !== undefined) {
    await db.delete(userSocialHandles).where(eq(userSocialHandles.profileId, profile.id));
    if (data.socialHandles.length > 0) {
      await db.insert(userSocialHandles).values(
        data.socialHandles.map(h => ({ profileId: profile.id, platform: h.platform, handle: h.handle }))
      );
    }
  }

  const updated = await db.select().from(userProfiles).where(eq(userProfiles.id, profile.id)).limit(1);
  return updated[0];
}

// ─── Follow Helpers ─────────────────────────────────────────────────

export async function toggleFollow(followerId: number, followingId: number): Promise<{ following: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (followerId === followingId) throw new Error("Cannot follow yourself");

  const existing = await db.select().from(userFollows)
    .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(userFollows)
      .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)));
    return { following: false };
  } else {
    await db.insert(userFollows).values({ followerId, followingId });
    return { following: true };
  }
}

export async function isFollowing(followerId: number, followingId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(userFollows)
    .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followingId, followingId)))
    .limit(1);
  return rows.length > 0;
}

export async function getFollowers(userId: number): Promise<{ id: number; name: string | null; username: string | null; avatarUrl: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: users.id,
    name: users.name,
    username: userProfiles.username,
    avatarUrl: userProfiles.avatarUrl,
  })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followerId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(userFollows.followingId, userId))
    .orderBy(desc(userFollows.createdAt));
  return rows;
}

export async function getFollowing(userId: number): Promise<{ id: number; name: string | null; username: string | null; avatarUrl: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: users.id,
    name: users.name,
    username: userProfiles.username,
    avatarUrl: userProfiles.avatarUrl,
  })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followingId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(userFollows.followerId, userId))
    .orderBy(desc(userFollows.createdAt));
  return rows;
}

export async function getFollowerCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql<number>`COUNT(*)` }).from(userFollows).where(eq(userFollows.followingId, userId));
  return rows[0]?.count ?? 0;
}

export async function getFollowingCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql<number>`COUNT(*)` }).from(userFollows).where(eq(userFollows.followerId, userId));
  return rows[0]?.count ?? 0;
}

// ─── Liked Use Cases (upvoted by a user) ────────────────────────────

export async function getLikedUseCases(userId: number): Promise<UseCaseWithDetails[]> {
  const db = await getDb();
  if (!db) return [];

  const upvoteRows = await db.select({ useCaseId: upvotes.useCaseId })
    .from(upvotes)
    .where(eq(upvotes.userId, userId))
    .orderBy(desc(upvotes.createdAt));

  if (upvoteRows.length === 0) return [];

  const ucIds = upvoteRows.map(r => r.useCaseId);
  const rows = await db.select().from(useCases)
    .where(and(inArray(useCases.id, ucIds), eq(useCases.status, "approved")));

  if (rows.length === 0) return [];

  // Fetch submitter names
  const submitterIds = Array.from(new Set(rows.map(r => r.submitterId)));
  const submitterRows = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, submitterIds));
  const submitterMap = new Map(submitterRows.map(s => [s.id, s.name]));

  // Fetch profile usernames
  const profileRows = await db.select({ userId: userProfiles.userId, username: userProfiles.username }).from(userProfiles).where(inArray(userProfiles.userId, submitterIds));
  const profileMap = new Map(profileRows.map(p => [p.userId, p.username]));

  // Fetch categories
  const catJoin = await db.select({
    useCaseId: useCaseCategories.useCaseId,
    categoryId: useCaseCategories.categoryId,
    name: categories.name,
    slug: categories.slug,
    type: categories.type,
  }).from(useCaseCategories).innerJoin(categories, eq(useCaseCategories.categoryId, categories.id)).where(inArray(useCaseCategories.useCaseId, ucIds));
  const catMap = new Map<number, { id: number; name: string; slug: string; type: string }[]>();
  for (const c of catJoin) { if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []); catMap.get(c.useCaseId)!.push({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type }); }

  // Fetch screenshots
  const ssRows = await db.select().from(screenshots).where(inArray(screenshots.useCaseId, ucIds)).orderBy(asc(screenshots.sortOrder));
  const ssMap = new Map<number, { id: number; url: string; sortOrder: number }[]>();
  for (const s of ssRows) { if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, []); ssMap.get(s.useCaseId)!.push({ id: s.id, url: s.url, sortOrder: s.sortOrder }); }

  // Maintain upvote order
  const ucMap = new Map(rows.map(r => [r.id, r]));
  return ucIds
    .filter(id => ucMap.has(id))
    .map(id => {
      const uc = ucMap.get(id)!;
      return {
        ...uc,
        submitterName: submitterMap.get(uc.submitterId) ?? null,
        submitterUsername: profileMap.get(uc.submitterId) ?? null,
        submitterAvatar: null,
        categories: catMap.get(uc.id) ?? [],
        screenshots: ssMap.get(uc.id) ?? [],
        hasUpvoted: true,
      };
    });
}

// ─── Profile Stats ──────────────────────────────────────────────────

export async function getProfileStats(userId: number): Promise<{
  useCaseCount: number;
  upvotesReceived: number;
  followerCount: number;
  followingCount: number;
}> {
  const db = await getDb();
  if (!db) return { useCaseCount: 0, upvotesReceived: 0, followerCount: 0, followingCount: 0 };

  // Count approved use cases
  const ucRows = await db.select({ count: sql<number>`COUNT(*)` }).from(useCases)
    .where(and(eq(useCases.submitterId, userId), eq(useCases.status, "approved")));
  const useCaseCount = ucRows[0]?.count ?? 0;

  // Sum upvotes received on all their approved use cases
  const upvoteRows = await db.select({ total: sql<number>`COALESCE(SUM(${useCases.upvoteCount}), 0)` }).from(useCases)
    .where(and(eq(useCases.submitterId, userId), eq(useCases.status, "approved")));
  const upvotesReceived = upvoteRows[0]?.total ?? 0;

  // Follower count
  const followerRows = await db.select({ count: sql<number>`COUNT(*)` }).from(userFollows).where(eq(userFollows.followingId, userId));
  const followerCount = followerRows[0]?.count ?? 0;

  // Following count
  const followingRows = await db.select({ count: sql<number>`COUNT(*)` }).from(userFollows).where(eq(userFollows.followerId, userId));
  const followingCount = followingRows[0]?.count ?? 0;

  return { useCaseCount, upvotesReceived, followerCount, followingCount };
}

// ─── AI Summary Helpers ─────────────────────────────────────────────

export async function saveAiSummary(useCaseId: number, summary: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(useCases).set({ aiSummary: summary }).where(eq(useCases.id, useCaseId));
}

export async function getWithoutAiSummary(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const rows: any[] = await db.execute(sql`
    SELECT ${useCases.id}
    FROM ${useCases}
    WHERE ${useCases.aiSummary} IS NULL OR ${useCases.aiSummary} = ''
    ORDER BY ${useCases.createdAt} ASC
  `);

  const result = (rows as any)?.[0] ?? rows;
  return (Array.isArray(result) ? result : []).map((r: any) => Number(r.id));
}

export async function addScreenshotToUseCase(useCaseId: number, url: string, fileKey: string): Promise<{ id: number; url: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current max sort order
  const existing = await db.select({ maxSort: sql<number>`COALESCE(MAX(${screenshots.sortOrder}), -1)` })
    .from(screenshots)
    .where(eq(screenshots.useCaseId, useCaseId));
  const nextSort = (existing[0]?.maxSort ?? -1) + 1;

  const [result] = await db.insert(screenshots).values({
    useCaseId,
    url,
    fileKey,
    sortOrder: nextSort,
  });

  return { id: (result as any).insertId, url };
}

// ─── Category Lookup by Slugs (for API) ──────────────────────────────
export async function getCategoryIdsBySlugs(slugs: string[]): Promise<{ id: number; slug: string }[]> {
  const db = await getDb();
  if (!db || slugs.length === 0) return [];
  const rows = await db.select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(inArray(categories.slug, slugs));
  return rows;
}

// ─── Get or Create API Submitter User ──────────────────────────────
export async function getOrCreateApiSubmitter(data: { name: string; email?: string }): Promise<{ id: number; name: string | null }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const openId = `api-submitter-${(data.email || "anonymous").toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  // Try to find existing
  const existing = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.openId, openId)).limit(1);
  if (existing.length > 0) return existing[0];

  // Create new
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email || null,
    role: "user",
    lastSignedIn: new Date(),
  });

  const created = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.openId, openId)).limit(1);
  if (created.length === 0) throw new Error("Failed to create API submitter user");
  return created[0];
}

// ─── Bulk Approve All Pending ──────────────────────────────────────
export async function bulkApproveAllPending(): Promise<{ approved: number; ids: number[] }> {
  const db = await getDb();
  if (!db) return { approved: 0, ids: [] };

  // Get all pending use case IDs
  const pendingRows: any[] = await db.execute(sql`
    SELECT id FROM use_cases WHERE status = 'pending' ORDER BY createdAt ASC
  `);
  const rows = (pendingRows as any)?.[0] ?? pendingRows;
  const ids = (Array.isArray(rows) ? rows : []).map((r: any) => Number(r.id));

  if (ids.length === 0) return { approved: 0, ids: [] };

  // Bulk update all pending to approved
  await db.update(useCases).set({
    status: "approved",
    approvedAt: new Date(),
  }).where(eq(useCases.status, "pending"));

  return { approved: ids.length, ids };
}

// ─── Delete Screenshot ──────────────────────────────────────────────
export async function deleteScreenshot(screenshotId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(screenshots).where(eq(screenshots.id, screenshotId));
}


// ─── Collections ──────────────────────────────────────────────────────

export async function createCollection(data: {
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  createdBy: number;
}): Promise<Collection> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(collections).values(data).$returningId();
  const [row] = await db.select().from(collections).where(eq(collections.id, result.id));
  return row;
}

export async function updateCollection(id: number, data: {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  isPublished?: boolean;
  sortOrder?: number;
}): Promise<Collection | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(collections).set(data).where(eq(collections.id, id));
  const [row] = await db.select().from(collections).where(eq(collections.id, id));
  return row ?? null;
}

export async function deleteCollection(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(collectionUseCases).where(eq(collectionUseCases.collectionId, id));
  await db.delete(collections).where(eq(collections.id, id));
}

export async function getCollectionBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(collections).where(eq(collections.slug, slug));
  if (!row) return null;
  // Get use cases in this collection
  const items = await db
    .select({
      useCaseId: collectionUseCases.useCaseId,
      sortOrder: collectionUseCases.sortOrder,
    })
    .from(collectionUseCases)
    .where(eq(collectionUseCases.collectionId, row.id))
    .orderBy(collectionUseCases.sortOrder);
  
  if (items.length === 0) return { ...row, useCases: [] };

  const ucIds = items.map(i => i.useCaseId);
  const ucs = await db
    .select()
    .from(useCases)
    .where(inArray(useCases.id, ucIds));

  // Enrich with screenshots and categories
  const screenshotRows = await db
    .select()
    .from(screenshots)
    .where(inArray(screenshots.useCaseId, ucIds))
    .orderBy(screenshots.sortOrder);

  const catRows = await db
    .select({
      useCaseId: useCaseCategories.useCaseId,
      categoryId: useCaseCategories.categoryId,
      name: categories.name,
      slug: categories.slug,
      type: categories.type,
    })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(inArray(useCaseCategories.useCaseId, ucIds));

  const scoreRows = await db
    .select()
    .from(aiScores)
    .where(inArray(aiScores.useCaseId, ucIds))
    .orderBy(desc(aiScores.scannedAt));

  const enriched = items.map(item => {
    const uc = ucs.find(u => u.id === item.useCaseId);
    if (!uc) return null;
    return {
      ...uc,
      screenshots: screenshotRows.filter(s => s.useCaseId === uc.id),
      categories: catRows.filter(c => c.useCaseId === uc.id),
      aiScore: scoreRows.find(s => s.useCaseId === uc.id) ?? null,
      collectionSortOrder: item.sortOrder,
    };
  }).filter(Boolean);

  return { ...row, useCases: enriched };
}

export async function getAllCollections(opts?: { publishedOnly?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query = db.select().from(collections).orderBy(collections.sortOrder, collections.createdAt);
  
  const rows = opts?.publishedOnly
    ? await db.select().from(collections).where(eq(collections.isPublished, true)).orderBy(collections.sortOrder, collections.createdAt)
    : await db.select().from(collections).orderBy(collections.sortOrder, collections.createdAt);

  // Count use cases per collection
  const allItems = await db.select({
    collectionId: collectionUseCases.collectionId,
    useCaseId: collectionUseCases.useCaseId,
  }).from(collectionUseCases);

  return rows.map(c => ({
    ...c,
    useCaseCount: allItems.filter(i => i.collectionId === c.id).length,
  }));
}

export async function addUseCaseToCollection(collectionId: number, useCaseId: number, sortOrder: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(collectionUseCases).values({ collectionId, useCaseId, sortOrder });
  } catch (e: any) {
    if (e.code === "ER_DUP_ENTRY") return; // already in collection
    throw e;
  }
}

export async function removeUseCaseFromCollection(collectionId: number, useCaseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(collectionUseCases).where(
    and(
      eq(collectionUseCases.collectionId, collectionId),
      eq(collectionUseCases.useCaseId, useCaseId)
    )
  );
}

export async function getCollectionUseCaseIds(collectionId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ useCaseId: collectionUseCases.useCaseId })
    .from(collectionUseCases)
    .where(eq(collectionUseCases.collectionId, collectionId))
    .orderBy(collectionUseCases.sortOrder);
  return rows.map(r => r.useCaseId);
}

// ─── Featured Use Case ──────────────────────────────────────────────

export async function setFeaturedUseCase(data: {
  useCaseId: number;
  editorialBlurb?: string;
  featuredBy: number;
}): Promise<FeaturedUseCase> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Deactivate all current featured
  await db.update(featuredUseCase).set({ isActive: false }).where(eq(featuredUseCase.isActive, true));
  // Insert new
  const [result] = await db.insert(featuredUseCase).values({
    useCaseId: data.useCaseId,
    editorialBlurb: data.editorialBlurb,
    featuredBy: data.featuredBy,
    isActive: true,
  }).$returningId();
  const [row] = await db.select().from(featuredUseCase).where(eq(featuredUseCase.id, result.id));
  return row;
}

export async function getActiveFeaturedUseCase() {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(featuredUseCase)
    .where(eq(featuredUseCase.isActive, true))
    .orderBy(desc(featuredUseCase.createdAt))
    .limit(1);
  if (!row) return null;

  // Get the use case details
  const [uc] = await db.select().from(useCases).where(eq(useCases.id, row.useCaseId));
  if (!uc || uc.status !== "approved") return null;

  // Get screenshots
  const screenshotList = await db
    .select()
    .from(screenshots)
    .where(eq(screenshots.useCaseId, uc.id))
    .orderBy(screenshots.sortOrder);

  // Get categories
  const catRows = await db
    .select({
      categoryId: useCaseCategories.categoryId,
      name: categories.name,
      slug: categories.slug,
      type: categories.type,
    })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(eq(useCaseCategories.useCaseId, uc.id));

  // Get AI score
  const [score] = await db.select().from(aiScores).where(eq(aiScores.useCaseId, uc.id)).orderBy(desc(aiScores.scannedAt)).limit(1);

  return {
    ...row,
    useCase: {
      ...uc,
      screenshots: screenshotList,
      categories: catRows,
      aiScore: score ?? null,
    },
  };
}

export async function removeFeaturedUseCase(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(featuredUseCase).set({ isActive: false }).where(eq(featuredUseCase.isActive, true));
}

export async function deleteUseCase(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all related records first (no FK constraints, manual cascade)
  await db.delete(useCaseCategories).where(eq(useCaseCategories.useCaseId, id));
  await db.delete(screenshots).where(eq(screenshots.useCaseId, id));
  await db.delete(upvotes).where(eq(upvotes.useCaseId, id));
  await db.delete(aiScores).where(eq(aiScores.useCaseId, id));
  await db.delete(viewEvents).where(eq(viewEvents.useCaseId, id));
  await db.delete(submitterNotifications).where(eq(submitterNotifications.useCaseId, id));
  await db.delete(collectionUseCases).where(eq(collectionUseCases.useCaseId, id));
  await db.delete(featuredUseCase).where(eq(featuredUseCase.useCaseId, id));

  // Delete the use case itself
  await db.delete(useCases).where(eq(useCases.id, id));
}
