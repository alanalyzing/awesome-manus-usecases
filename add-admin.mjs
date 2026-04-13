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

// Check if lucia@manus.ai exists
const [rows] = await conn.execute("SELECT id, email, name, role FROM users WHERE email = ?", ["lucia@manus.ai"]);
if (rows.length === 0) {
  console.log("User lucia@manus.ai not found in the database.");
  console.log("She needs to log in to the site first to create a user record.");
  console.log("\nListing all current users:");
  const [allUsers] = await conn.execute("SELECT id, email, name, role FROM users ORDER BY id");
  console.table(allUsers);
} else {
  const user = rows[0];
  console.log(`Found user: id=${user.id}, name=${user.name}, email=${user.email}, role=${user.role}`);
  if (user.role === 'admin') {
    console.log("User is already an admin!");
  } else {
    await conn.execute("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
    console.log(`Promoted ${user.email} to admin!`);
  }
}

await conn.end();
