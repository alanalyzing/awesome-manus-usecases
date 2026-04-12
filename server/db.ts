import { eq, and, sql, desc, asc, like, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  categories, Category,
  useCases, UseCase, InsertUseCase,
  useCaseCategories,
  screenshots, Screenshot,
  upvotes,
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
};

export async function getApprovedUseCases(opts: {
  search?: string;
  categoryIds?: number[];
  highlightOnly?: boolean;
  sort?: "popular" | "newest" | "views";
  limit?: number;
  offset?: number;
  userId?: number;
}): Promise<{ items: UseCaseWithDetails[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  // Build where conditions
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

  // If filtering by categories, get matching use case IDs first
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

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(useCases)
    .where(whereClause);
  const total = countResult[0]?.count ?? 0;

  // Sort
  let orderBy;
  switch (opts.sort) {
    case "popular": orderBy = desc(useCases.upvoteCount); break;
    case "views": orderBy = desc(useCases.viewCount); break;
    case "newest": default: orderBy = desc(useCases.createdAt); break;
  }

  // Get use cases
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

  // Fetch categories for these use cases
  const ucCats = await db
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

  const catMap = new Map<number, { id: number; name: string; slug: string; type: string }[]>();
  for (const c of ucCats) {
    if (!catMap.has(c.useCaseId)) catMap.set(c.useCaseId, []);
    catMap.get(c.useCaseId)!.push({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type });
  }

  // Fetch screenshots
  const screenshotRows = await db
    .select()
    .from(screenshots)
    .where(inArray(screenshots.useCaseId, ucIds))
    .orderBy(asc(screenshots.sortOrder));

  const ssMap = new Map<number, { id: number; url: string; sortOrder: number }[]>();
  for (const s of screenshotRows) {
    if (!ssMap.has(s.useCaseId)) ssMap.set(s.useCaseId, []);
    ssMap.get(s.useCaseId)!.push({ id: s.id, url: s.url, sortOrder: s.sortOrder });
  }

  // Fetch user upvotes if authenticated
  let upvoteSet = new Set<number>();
  if (opts.userId) {
    const userUpvotes = await db
      .select({ useCaseId: upvotes.useCaseId })
      .from(upvotes)
      .where(and(inArray(upvotes.useCaseId, ucIds), eq(upvotes.userId, opts.userId)));
    upvoteSet = new Set(userUpvotes.map(u => u.useCaseId));
  }

  const items: UseCaseWithDetails[] = rows.map(uc => ({
    ...uc,
    submitterName: submitterMap.get(uc.submitterId) ?? null,
    categories: catMap.get(uc.id) ?? [],
    screenshots: ssMap.get(uc.id) ?? [],
    hasUpvoted: opts.userId ? upvoteSet.has(uc.id) : undefined,
  }));

  return { items, total };
}

export async function getUseCaseBySlug(slug: string, userId?: number): Promise<UseCaseWithDetails | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(useCases).where(eq(useCases.slug, slug)).limit(1);
  if (rows.length === 0) return null;
  const uc = rows[0];

  // Increment view count
  await db.update(useCases).set({ viewCount: sql`${useCases.viewCount} + 1` }).where(eq(useCases.id, uc.id));

  // Submitter name
  const submitterRows = await db.select({ name: users.name }).from(users).where(eq(users.id, uc.submitterId)).limit(1);

  // Categories
  const ucCats = await db
    .select({ categoryId: useCaseCategories.categoryId, name: categories.name, slug: categories.slug, type: categories.type })
    .from(useCaseCategories)
    .innerJoin(categories, eq(useCaseCategories.categoryId, categories.id))
    .where(eq(useCaseCategories.useCaseId, uc.id));

  // Screenshots
  const screenshotRows = await db.select().from(screenshots).where(eq(screenshots.useCaseId, uc.id)).orderBy(asc(screenshots.sortOrder));

  // User upvote
  let hasUpvoted = false;
  if (userId) {
    const upvoteRow = await db.select().from(upvotes).where(and(eq(upvotes.useCaseId, uc.id), eq(upvotes.userId, userId))).limit(1);
    hasUpvoted = upvoteRow.length > 0;
  }

  return {
    ...uc,
    viewCount: uc.viewCount + 1,
    submitterName: submitterRows[0]?.name ?? null,
    categories: ucCats.map(c => ({ id: c.categoryId, name: c.name, slug: c.slug, type: c.type })),
    screenshots: screenshotRows.map(s => ({ id: s.id, url: s.url, sortOrder: s.sortOrder })),
    hasUpvoted,
  };
}

export async function getRelatedUseCases(useCaseId: number, categoryIds: number[], limit = 4): Promise<UseCaseWithDetails[]> {
  const db = await getDb();
  if (!db || categoryIds.length === 0) return [];

  // Find use cases sharing at least one category
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

  // Insert category associations
  if (data.categoryIds.length > 0) {
    await db.insert(useCaseCategories).values(
      data.categoryIds.map(catId => ({ useCaseId: insertId, categoryId: catId }))
    );
  }

  // Insert screenshots
  if (data.screenshotData.length > 0) {
    await db.insert(screenshots).values(
      data.screenshotData.map((s, i) => ({ useCaseId: insertId, url: s.url, fileKey: s.fileKey, sortOrder: i }))
    );
  }

  const created = await db.select().from(useCases).where(eq(useCases.id, insertId)).limit(1);
  return created[0];
}

// ─── Upvote Helpers ──────────────────────────────────────────────────

export async function toggleUpvote(useCaseId: number, userId: number): Promise<{ upvoted: boolean; newCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already upvoted
  const existing = await db.select().from(upvotes).where(and(eq(upvotes.useCaseId, useCaseId), eq(upvotes.userId, userId))).limit(1);

  if (existing.length > 0) {
    // Remove upvote
    await db.delete(upvotes).where(and(eq(upvotes.useCaseId, useCaseId), eq(upvotes.userId, userId)));
    await db.update(useCases).set({ upvoteCount: sql`GREATEST(${useCases.upvoteCount} - 1, 0)` }).where(eq(useCases.id, useCaseId));
    const updated = await db.select({ upvoteCount: useCases.upvoteCount }).from(useCases).where(eq(useCases.id, useCaseId)).limit(1);
    return { upvoted: false, newCount: updated[0]?.upvoteCount ?? 0 };
  } else {
    // Add upvote
    await db.insert(upvotes).values({ useCaseId, userId });
    await db.update(useCases).set({ upvoteCount: sql`${useCases.upvoteCount} + 1` }).where(eq(useCases.id, useCaseId));
    const updated = await db.select({ upvoteCount: useCases.upvoteCount }).from(useCases).where(eq(useCases.id, useCaseId)).limit(1);
    return { upvoted: true, newCount: updated[0]?.upvoteCount ?? 0 };
  }
}

// ─── Admin Helpers ───────────────────────────────────────────────────

export async function getAdminUseCases(opts: {
  status?: "pending" | "approved" | "rejected";
  limit?: number;
  offset?: number;
}): Promise<{ items: (UseCase & { submitterName: string | null; submitterEmail: string | null; categories: { id: number; name: string; slug: string; type: string }[]; screenshots: { id: number; url: string; sortOrder: number }[] })[]; total: number }> {
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

  const items = rows.map(uc => ({
    ...uc,
    submitterName: submitterMap.get(uc.submitterId)?.name ?? null,
    submitterEmail: submitterMap.get(uc.submitterId)?.email ?? null,
    categories: catMap.get(uc.id) ?? [],
    screenshots: ssMap.get(uc.id) ?? [],
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

  // Replace categories
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
