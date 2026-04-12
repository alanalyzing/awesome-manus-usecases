import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, uniqueIndex } from "drizzle-orm/mysql-core";

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

// ─── Upvotes ─────────────────────────────────────────────────────────
export const upvotes = mysqlTable("upvotes", {
  id: int("id").autoincrement().primaryKey(),
  useCaseId: int("useCaseId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("upvote_unique").on(table.useCaseId, table.userId),
]);

export type Upvote = typeof upvotes.$inferSelect;
