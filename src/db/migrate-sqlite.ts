import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './sqlite-adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations', 'sqlite');

function getAppliedMigrations(): Set<string> {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT name FROM migrations ORDER BY id').all() as { name: string }[];
    return new Set(rows.map(r => r.name));
  } catch {
    return new Set();
  }
}

export async function runSqliteMigrations(): Promise<void> {
  console.log('[SQLite Migrate] Starting...');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[SQLite Migrate] No migration directory found.');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[SQLite Migrate] No migration files found.');
    return;
  }

  const applied = getAppliedMigrations();
  const db = getDb();

  for (const file of files) {
    const name = file.replace('.sql', '');

    if (applied.has(name)) {
      continue;
    }

    console.log(`[SQLite Migrate] Applying: ${name}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    try {
      db.exec(sql);
      console.log(`[SQLite Migrate] Applied: ${name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate column name')) {
        console.warn(`[SQLite Migrate] Skipped (column already exists): ${name}`);
        try {
          db.exec(`INSERT OR IGNORE INTO migrations (name) VALUES ('${name}')`);
        } catch { /* ignore */ }
      } else {
        console.error(`[SQLite Migrate] Failed: ${name}`, err);
        throw err;
      }
    }
  }

  console.log('[SQLite Migrate] Done.');
}
