import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function clearSeedData() {
  console.log("Clearing all seed data...\n");

  // Order matters due to foreign key-like relationships
  // Delete from child tables first, then parent tables

  // 1. View events
  const viewEventsResult = await db.execute(sql`DELETE FROM view_events`);
  console.log(`Deleted view_events rows`);

  // 2. AI scores
  const aiScoresResult = await db.execute(sql`DELETE FROM ai_scores`);
  console.log(`Deleted ai_scores rows`);

  // 3. Admin activity log
  const activityResult = await db.execute(sql`DELETE FROM admin_activity_log`);
  console.log(`Deleted admin_activity_log rows`);

  // 4. Submitter notifications
  const notifResult = await db.execute(sql`DELETE FROM submitter_notifications`);
  console.log(`Deleted submitter_notifications rows`);

  // 5. Upvotes
  const upvotesResult = await db.execute(sql`DELETE FROM upvotes`);
  console.log(`Deleted upvotes rows`);

  // 6. Screenshots
  const screenshotsResult = await db.execute(sql`DELETE FROM screenshots`);
  console.log(`Deleted screenshots rows`);

  // 7. Use case categories (junction table)
  const ucCatResult = await db.execute(sql`DELETE FROM use_case_categories`);
  console.log(`Deleted use_case_categories rows`);

  // 8. Use cases
  const useCasesResult = await db.execute(sql`DELETE FROM use_cases`);
  console.log(`Deleted use_cases rows`);

  // 9. Delete seed users (users with openId starting with 'seed-')
  const seedUsersResult = await db.execute(sql`DELETE FROM users WHERE openId LIKE 'seed-%'`);
  console.log(`Deleted seed users`);

  // Reset auto-increment counters for clean state
  await db.execute(sql`ALTER TABLE use_cases AUTO_INCREMENT = 1`);
  await db.execute(sql`ALTER TABLE screenshots AUTO_INCREMENT = 1`);
  await db.execute(sql`ALTER TABLE upvotes AUTO_INCREMENT = 1`);
  await db.execute(sql`ALTER TABLE use_case_categories AUTO_INCREMENT = 1`);
  await db.execute(sql`ALTER TABLE view_events AUTO_INCREMENT = 1`);
  await db.execute(sql`ALTER TABLE ai_scores AUTO_INCREMENT = 1`);
  await db.execute(sql`ALTER TABLE admin_activity_log AUTO_INCREMENT = 1`);
  await db.execute(sql`ALTER TABLE submitter_notifications AUTO_INCREMENT = 1`);
  console.log("\nAuto-increment counters reset.");

  console.log("\n✅ All seed data cleared successfully!");
  console.log("Categories and real users have been preserved.");
  process.exit(0);
}

clearSeedData().catch((err) => {
  console.error("Error clearing seed data:", err);
  process.exit(1);
});
