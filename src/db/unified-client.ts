import { config } from '../lib/config.js';

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

export interface TransactionClient {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

type DbBackend = 'sqlite' | 'pg' | null;
let backend: DbBackend = null;

let pgQuery: ((text: string, params?: unknown[]) => Promise<QueryResult>) | null = null;
let pgTransaction: ((fn: (client: TransactionClient) => Promise<any>) => Promise<any>) | null = null;
let pgCheckConnection: (() => Promise<boolean>) | null = null;
let pgClosePool: (() => Promise<void>) | null = null;

let sqliteQueryFn: ((text: string, params?: unknown[]) => Promise<QueryResult>) | null = null;
let sqliteTransactionFn: ((fn: (client: TransactionClient) => Promise<any>) => Promise<any>) | null = null;
let sqliteClose: (() => void) | null = null;

export async function initializeDatabase(): Promise<'sqlite' | 'pg'> {
  const dbUrl = config.database.url;

  if (dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
    const pgMod = await import('./client.js');
    pgQuery = pgMod.query;
    pgTransaction = pgMod.transaction;
    pgCheckConnection = pgMod.checkConnection;
    pgClosePool = pgMod.closePool;

    const connected = await pgCheckConnection();
    if (!connected) {
      console.warn('[Sprink DB] PostgreSQL not available, falling back to SQLite');
      return initSqlite();
    }

    backend = 'pg';

    const { runPgMigrations } = await import('./migrate-pg.js');
    await runPgMigrations();

    console.log('[Sprink DB] Backend: PostgreSQL');
    return 'pg';
  }

  return initSqlite();
}

async function initSqlite(): Promise<'sqlite'> {
  const { openDatabase, sqliteQuery, sqliteTransaction, closeDatabase } = await import('./sqlite-adapter.js');

  const dbPath = config.database.sqlitePath;
  openDatabase(dbPath);

  sqliteQueryFn = sqliteQuery;
  sqliteTransactionFn = sqliteTransaction;
  sqliteClose = closeDatabase;

  backend = 'sqlite';

  const { runSqliteMigrations } = await import('./migrate-sqlite.js');
  await runSqliteMigrations();

  const result = await sqliteQuery<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (result.rows[0].count === 0) {
    const { seedDevelopmentData } = await import('./seed-dev.js');
    await seedDevelopmentData();
  }
  console.log('[Sprink DB] Backend: SQLite');
  return 'sqlite';
}

export function getBackend(): DbBackend {
  return backend;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  if (backend === 'pg' && pgQuery) {
    return pgQuery(text, params) as Promise<QueryResult<T>>;
  }
  if (backend === 'sqlite' && sqliteQueryFn) {
    return sqliteQueryFn(text, params) as Promise<QueryResult<T>>;
  }
  throw new Error('[DB] Database not initialized. Call initializeDatabase() first.');
}

export async function transaction<T>(
  fn: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  if (backend === 'pg' && pgTransaction) {
    return pgTransaction(fn);
  }
  if (backend === 'sqlite' && sqliteTransactionFn) {
    return sqliteTransactionFn(fn);
  }
  throw new Error('[DB] Database not initialized. Call initializeDatabase() first.');
}

export async function checkConnection(): Promise<boolean> {
  if (backend === 'pg' && pgCheckConnection) {
    return pgCheckConnection();
  }
  if (backend === 'sqlite') {
    return true;
  }
  return false;
}

export async function closePool(): Promise<void> {
  if (backend === 'pg' && pgClosePool) {
    await pgClosePool();
  }
  if (backend === 'sqlite' && sqliteClose) {
    sqliteClose();
  }
  backend = null;
}
