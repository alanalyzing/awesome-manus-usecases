import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(url);

try {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS view_events (
      id int AUTO_INCREMENT NOT NULL,
      useCaseId int NOT NULL,
      visitorKey varchar(128),
      createdAt timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT view_events_id PRIMARY KEY(id)
    )
  `);
  console.log("Created view_events table");

  await conn.execute(`
    CREATE INDEX idx_view_events_usecase_date ON view_events(useCaseId, createdAt)
  `).catch(() => console.log("Index already exists"));

  console.log("Migration complete");
} finally {
  await conn.end();
}
