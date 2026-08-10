import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!dbUrl) {
  console.error("Missing DATABASE_URL or SUPABASE_DATABASE_URL environment variable.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: dbUrl,
});

async function runMigration() {
  try {
    await client.connect();
    console.log("Connected to database.");

    const sqlFilePath = path.join(__dirname, '..', 'db_setup.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log("Executing SQL migration...");
    await client.query(sql);
    console.log("Migration executed successfully.");

  } catch (err) {
    console.error("Error executing migration:", err);
  } finally {
    await client.end();
  }
}

runMigration();
