import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(url);

try {
  // Check if columns already exist
  const [cols] = await conn.query("SHOW COLUMNS FROM ai_scores LIKE 'complexityScore'");
  if (Array.isArray(cols) && cols.length === 0) {
    await conn.query("ALTER TABLE `ai_scores` ADD `complexityScore` decimal(3,1) NOT NULL DEFAULT 0.0");
    console.log("Added complexityScore column");
  } else {
    console.log("complexityScore column already exists");
  }

  const [cols2] = await conn.query("SHOW COLUMNS FROM ai_scores LIKE 'presentationScore'");
  if (Array.isArray(cols2) && cols2.length === 0) {
    await conn.query("ALTER TABLE `ai_scores` ADD `presentationScore` decimal(3,1) NOT NULL DEFAULT 0.0");
    console.log("Added presentationScore column");
  } else {
    console.log("presentationScore column already exists");
  }

  console.log("Migration complete!");
} finally {
  await conn.end();
}
