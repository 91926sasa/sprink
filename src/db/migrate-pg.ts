import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function getAppliedMigrations(): Promise<Set<string>> {
  try {
    const result = await query<{ name: string }>('SELECT name FROM migrations ORDER BY id');
    return new Set(result.rows.map(r => r.name));
  } catch {
    return new Set();
  }
}

export async function runPgMigrations(): Promise<void> {
  console.log('[PG Migrate] Starting...');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[PG Migrate] No migration directory found.');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[PG Migrate] No migration files found.');
    return;
  }

  const applied = await getAppliedMigrations();

  for (const file of files) {
    const name = file.replace('.sql', '');

    if (applied.has(name)) {
      continue;
    }

    console.log(`[PG Migrate] Applying: ${name}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    try {
      await query(sql);
      console.log(`[PG Migrate] Applied: ${name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already exists')) {
        console.warn(`[PG Migrate] Skipped (already exists): ${name}`);
        try {
          await query(`INSERT INTO migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`, [name]);
        } catch { /* ignore */ }
      } else {
        console.error(`[PG Migrate] Failed: ${name}`, err);
        throw err;
      }
    }
  }

  console.log('[PG Migrate] Done.');
}
