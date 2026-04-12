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

export async function getCategoriesByType(type: "job_function" | "feature"): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.type, type)).orderBy(asc(categories.sortOrder));
}

// ─── Use Case Helpers ────────────────────────────────────────────────

export type UseCaseWithDetails = UseCase & {
  submitterName: string | null;
  categories: { id: number; name: string; slug: string; type: string }[];
  screenshots: { id: number; url: string; sortOrder: number }[];
  hasUpvoted?: boolean;
  aiScore?: { overall: string; completeness: string; innovativeness: string; impact: string; complexity: string; presentation: string; reasoning: string | null } | null;
};

export async function getApprovedUseCases(opts: {
  search?: string;
  categoryIds?: number[];
  highlightOnly?: boolean;
  sort?: "popular" | "newest" | "views";
  limit?: number;
  offset?: number;
  visitorKey?: string;
}): Promise<{ items: UseCaseWithDetails[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [eq(useCases.status, "approved")];
  if (opts.search) {
    conditions.push(
      or(
        like(useCases.title, `%${opts.search}%`),
        like(useCases.description, `%${opts.search}%`)
      )!
    );
  }
  if (opts.highlightOnly) {
    conditions.push(eq(useCases.isHighlight, true));
  }

  let filteredIds: number[] | undefined;
  if (opts.categoryIds && opts.categoryIds.length > 0) {
    const matchingUcIds = await db
      .select({ useCaseId: useCaseCategories.useCaseId })
      .from(useCaseCategories)
      .where(inArray(useCaseCategories.categoryId, opts.categoryIds));
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

  let orderBy;
  switch (opts.sort) {
    case "popular": orderBy = desc(useCases.upvoteCount); break;
    case "views": orderBy = desc(useCases.viewCount); break;
    case "newest": default: orderBy = desc(useCases.createdAt); break;
  }

  const rows = await db
    .select()
    .from(useCases)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(opts.limit ?? 20)
    .offset(opts.offset ?? 0);

  if (rows.length === 0) return { items: [], total };

  const ucIds = rows.map(r => r.id);

  // Fetch submitter names
  const submitterIds = Array.from(new Set(rows.map(r => r.submitterId)));
  const submitters = submitterIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, submitterIds))
    : [];
  const submitterMap = new Map(submitters.map(s => [s.id, s.name]));

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
  const ssMap = new Map<number, { id: number; url: string; sortOrder: number }[]>();
  for (const s of screenshotRows) { if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, []); ssMap.get(s.useCaseId)!.push({ id: s.id, url: s.url, sortOrder: s.sortOrder }); }

  // Fetch visitor upvotes
  let upvoteSet = new Set<number>();
  if (opts.visitorKey) {
    const visitorUpvotes = await db
      .select({ useCaseId: upvotes.useCaseId })
      .from(upvotes)
      .where(and(inArray(upvotes.useCaseId, ucIds), eq(upvotes.visitorKey, opts.visitorKey)));
    upvoteSet = new Set(visitorUpvotes.map(u => u.useCaseId));
  }

  const items: UseCaseWithDetails[] = rows.map(uc => ({
    ...uc,
    submitterName: submitterMap.get(uc.submitterId) ?? null,
    categories: catMap.get(uc.id) ?? [],
    screenshots: ssMap.get(uc.id) ?? [],
    hasUpvoted: opts.visitorKey ? upvoteSet.has(uc.id) : undefined,
  }));

  return { items, total };
}

export async function getUseCaseBySlug(slug: string, visitorKey?: string): Promise<UseCaseWithDetails | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(useCases).where(eq(useCases.slug, slug)).limit(1);
  if (rows.length === 0) return null;
  const uc = rows[0];

  // Increment cumulative counter AND log a discrete view event
  await db.update(useCases).set({ viewCount: sql`${useCases.viewCount} + 1` }).where(eq(useCases.id, uc.id));
  await db.insert(viewEvents).values({ useCaseId: uc.id, visitorKey: visitorKey ?? null });

  const submitterRows = await db.select({ name: users.name }).from(users).where(eq(users.id, uc.submitterId)).limit(1);

  const ucCats = await db
    .select({ categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(eq(useCaseCategories.useCaseId, uc.id));

  const screenshotRows = await db.select().from(screenshots).where(eq(screenshots.useCaseId, uc.id)).orderBy(asc(screenshots.sortOrder));

  let hasUpvoted = false;
  if (visitorKey) {
    const upvoteRow = await db.select().from(upvotes).where(and(eq(upvotes.useCaseId, uc.id), eq(upvotes.visitorKey, visitorKey))).limit(1);
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

  const rows = await db
    .select()
    .from(useCases)
    .where(and(inArray(useCases.id, uniqueIds), eq(useCases.status, "approved")))
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

  return rows.map(uc => ({
    ...uc,
    submitterName: submitterMap.get(uc.submitterId) ?? null,
    categories: catMap.get(uc.id) ?? [],
    screenshots: ssMap.get(uc.id) ?? [],
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
    return rows.map(uc => ({
      ...uc,
      submitterName: submitterMap.get(uc.submitterId) ?? null,
      categories: catMap.get(uc.id) ?? [],
      screenshots: ssMap.get(uc.id) ?? [],
    }));
  }

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

  // Sort by recent upvote count
  const trendingMap = new Map(trendingIds.map(r => [r.useCaseId, r.recentUpvotes]));
  return rows
    .map(uc => ({
      ...uc,
      submitterName: submitterMap.get(uc.submitterId) ?? null,
      categories: catMap.get(uc.id) ?? [],
      screenshots: ssMap.get(uc.id) ?? [],
      recentUpvotes: trendingMap.get(uc.id) ?? 0,
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

// ─── Upvote Helpers (visitor-key based, no login required) ──────────

export async function toggleUpvote(useCaseId: number, visitorKey: string): Promise<{ upvoted: boolean; newCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(upvotes).where(and(eq(upvotes.useCaseId, useCaseId), eq(upvotes.visitorKey, visitorKey))).limit(1);

  if (existing.length > 0) {
    await db.delete(upvotes).where(and(eq(upvotes.useCaseId, useCaseId), eq(upvotes.visitorKey, visitorKey)));
    await db.update(useCases).set({ upvoteCount: sql`GREATEST(${useCases.upvoteCount} - 1, 0)` }).where(eq(useCases.id, useCaseId));
    const updated = await db.select({ upvoteCount: useCases.upvoteCount }).from(useCases).where(eq(useCases.id, useCaseId)).limit(1);
    return { upvoted: false, newCount: updated[0]?.upvoteCount ?? 0 };
  } else {
    await db.insert(upvotes).values({ useCaseId, visitorKey });
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
  const aiScoreRows = await db.select().from(aiScores).where(inArray(aiScores.useCaseId, ucIds));
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
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateFields: Record<string, unknown> = {};
  if (data.title !== undefined) updateFields.title = data.title;
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.isHighlight !== undefined) updateFields.isHighlight = data.isHighlight;
  if (data.status !== undefined) updateFields.status = data.status;

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
