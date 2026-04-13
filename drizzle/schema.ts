import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, uniqueIndex, decimal } from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Categories ──────────────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  type: mysqlEnum("type", ["job_function", "feature"]).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── Use Cases ───────────────────────────────────────────────────────
export const useCases = mysqlTable("use_cases", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 250 }).notNull().unique(),
  description: text("description").notNull(),
  sessionReplayUrl: text("sessionReplayUrl"),
  deliverableUrl: text("deliverableUrl"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  isHighlight: boolean("isHighlight").default(false).notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  rejectionReason: text("rejectionReason"),
  consentToContact: boolean("consentToContact").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  upvoteCount: int("upvoteCount").default(0).notNull(),
  submitterId: int("submitterId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type UseCase = typeof useCases.$inferSelect;
export type InsertUseCase = typeof useCases.$inferInsert;

// ─── Use Case ↔ Category (many-to-many) ─────────────────────────────
export const useCaseCategories = mysqlTable("use_case_categories", {
  id: int("id").autoincrement().primaryKey(),
  useCaseId: int("useCaseId").notNull(),
  categoryId: int("categoryId").notNull(),
}, (table) => [
  uniqueIndex("uc_cat_unique").on(table.useCaseId, table.categoryId),
]);

export type UseCaseCategory = typeof useCaseCategories.$inferSelect;

// ─── Screenshots ─────────────────────────────────────────────────────
export const screenshots = mysqlTable("screenshots", {
  id: int("id").autoincrement().primaryKey(),
  useCaseId: int("useCaseId").notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Screenshot = typeof screenshots.$inferSelect;

// ─── Upvotes (user-based, login required) ───────────────────────
export const upvotes = mysqlTable("upvotes", {
  id: int("id").autoincrement().primaryKey(),
  useCaseId: int("useCaseId").notNull(),
  userId: int("userId").notNull(),
  visitorKey: varchar("visitorKey", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("upvote_user_unique").on(table.useCaseId, table.userId),
]);

export type Upvote = typeof upvotes.$inferSelect;

// ─── User Follows ───────────────────────────────────────────────
export const userFollows = mysqlTable("user_follows", {
  id: int("id").autoincrement().primaryKey(),
  followerId: int("followerId").notNull(),
  followingId: int("followingId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("follow_unique").on(table.followerId, table.followingId),
]);

export type UserFollow = typeof userFollows.$inferSelect;
export type InsertUserFollow = typeof userFollows.$inferInsert;

// ─── Submitter Notifications ────────────────────────────────────────
export const submitterNotifications = mysqlTable("submitter_notifications", {
  id: int("id").autoincrement().primaryKey(),
  useCaseId: int("useCaseId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["approved", "rejected"]).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubmitterNotification = typeof submitterNotifications.$inferSelect;

// ─── Admin Activity Log ─────────────────────────────────────────────
export const adminActivityLog = mysqlTable("admin_activity_log", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  action: varchar("action", { length: 64 }).notNull(), // approve, reject, highlight, edit, promote_admin, demote_admin, ai_scan
  targetType: varchar("targetType", { length: 32 }).notNull(), // use_case, user
  targetId: int("targetId").notNull(),
  details: text("details"), // JSON string with action-specific details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminActivityLog = typeof adminActivityLog.$inferSelect;

// ─── AI Scores ──────────────────────────────────────────────────────
export const aiScores = mysqlTable("ai_scores", {
  id: int("id").autoincrement().primaryKey(),
  useCaseId: int("useCaseId").notNull(),
  completenessScore: decimal("completenessScore", { precision: 3, scale: 1 }).notNull(),
  innovativenessScore: decimal("innovativenessScore", { precision: 3, scale: 1 }).notNull(),
  impactScore: decimal("impactScore", { precision: 3, scale: 1 }).notNull(),
  complexityScore: decimal("complexityScore", { precision: 3, scale: 1 }).notNull(),
  presentationScore: decimal("presentationScore", { precision: 3, scale: 1 }).notNull(),
  overallScore: decimal("overallScore", { precision: 3, scale: 1 }).notNull(),
  reasoning: text("reasoning"),
  scannedAt: timestamp("scannedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiScore = typeof aiScores.$inferSelect;

// ─── View Events (per-event view logging for accurate analytics) ────
export const viewEvents = mysqlTable("view_events", {
  id: int("id").autoincrement().primaryKey(),
  useCaseId: int("useCaseId").notNull(),
  visitorKey: varchar("visitorKey", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ViewEvent = typeof viewEvents.$inferSelect;

// ─── User Profiles ─────────────────────────────────────────────────
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  proficiency: mysqlEnum("proficiency", ["beginner", "intermediate", "advanced", "expert"]).notNull(),
  jobTitle: varchar("jobTitle", { length: 128 }),
  company: varchar("company", { length: 128 }),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─── User Social Handles ───────────────────────────────────────────
export const userSocialHandles = mysqlTable("user_social_handles", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  platform: mysqlEnum("platform", ["x", "instagram", "linkedin", "other"]).notNull(),
  handle: varchar("handle", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("profile_platform_unique").on(table.profileId, table.platform),
]);

export type UserSocialHandle = typeof userSocialHandles.$inferSelect;
export type InsertUserSocialHandle = typeof userSocialHandles.$inferInsert;
