import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

const JSON_COLUMNS = new Set([
  'facts_json', 'chapters', 'tags',
]);

const BOOLEAN_COLUMNS = new Set([
  'auth_social_linked', 'auth_l2_verified',
  'status_featured', 'spoiler',
]);

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error('[SQLite] Database not initialized. Call openDatabase() first.');
  return db;
}

export function openDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  console.log(`[SQLite] Opened: ${dbPath}`);
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[SQLite] Closed');
  }
}

export function translateSql(sql: string): string {
  let s = sql;

  s = s.replace(
    /EXTRACT\s*\(\s*EPOCH\s+FROM\s+\(\s*NOW\(\)\s*-\s*([a-z_.]+)\s*\)\s*\)/gi,
    "(strftime('%s','now') - strftime('%s', $1))",
  );

  s = s.replace(/\$\d+/g, '?');
  s = s.replace(/\bNOW\(\)/gi, "datetime('now')");
  s = s.replace(/::(float|text|jsonb|boolean|integer|bigint)/gi, '');

  return s;
}

function postProcessRow(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;

  for (const key of Object.keys(row)) {
    const val = row[key];

    if (JSON_COLUMNS.has(key) && typeof val === 'string') {
      try {
        row[key] = JSON.parse(val);
      } catch {
        // leave as-is
      }
      continue;
    }

    if (BOOLEAN_COLUMNS.has(key) && typeof val === 'number') {
      row[key] = val !== 0;
      continue;
    }

    if (key.endsWith('_at') && typeof val === 'string') {
      row[key] = new Date(val.endsWith('Z') ? val : val + 'Z');
      continue;
    }
  }

  return row;
}

export async function sqliteQuery<T = any>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const database = getDb();
  const sql = translateSql(text);
  const p = params ?? [];

  const sqliteParams = p.map(v => {
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  });

  const trimmed = sql.trimStart().toUpperCase();

  if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
    const stmt = database.prepare(sql);
    const rows = stmt.all(...sqliteParams) as any[];
    return {
      rows: rows.map(postProcessRow) as T[],
      rowCount: rows.length,
    };
  }

  const stmt = database.prepare(sql);
  const result = stmt.run(...sqliteParams);
  return {
    rows: [] as T[],
    rowCount: result.changes,
  };
}

export async function sqliteTransaction<T>(
  fn: (client: { query: <R = any>(text: string, params?: unknown[]) => Promise<QueryResult<R>> }) => Promise<T>,
): Promise<T> {
  const database = getDb();
  const client = { query: sqliteQuery };

  database.exec('BEGIN');
  try {
    const result = await fn(client);
    database.exec('COMMIT');
    return result;
  } catch (e) {
    database.exec('ROLLBACK');
    throw e;
  }
}
