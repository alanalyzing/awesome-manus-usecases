import mysql from 'mysql2/promise';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Get DATABASE_URL from running server process
const pids = execSync('pgrep -f "tsx watch"').toString().trim().split('\n');
let dbUrl = null;
for (const pid of pids) {
  try {
    const environ = readFileSync(`/proc/${pid.trim()}/environ`).toString();
    const match = environ.match(/DATABASE_URL=([^\0]+)/);
    if (match) { dbUrl = match[1]; break; }
  } catch (e) { /* skip */ }
}
if (!dbUrl) { console.error('No DATABASE_URL found'); process.exit(1); }

const conn = await mysql.createConnection(dbUrl);

// Run all pending migrations
const migrations = [
  {
    name: 'Add jobTitle column to user_profiles',
    sql: 'ALTER TABLE `user_profiles` ADD `jobTitle` varchar(128)',
    dupError: 'ER_DUP_FIELDNAME',
  },
];

for (const m of migrations) {
  try {
    await conn.execute(m.sql);
    console.log(`Applied: ${m.name}`);
  } catch (e) {
    if (m.dupError && e.code === m.dupError) {
      console.log(`Skipped (already applied): ${m.name}`);
    } else {
      console.error(`Failed: ${m.name}`, e.message);
    }
  }
}

await conn.end();
console.log('Migrations complete');
