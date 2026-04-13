import { query } from '../unified-client.js';
import { config } from '../../lib/config.js';

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export async function findSessionById(id: string): Promise<Session | null> {
  const result = await query<{
    id: string;
    user_id: string;
    expires_at: Date;
    created_at: Date;
  }>(
    `SELECT id, user_id, expires_at, created_at
     FROM sessions
     WHERE id = $1 AND expires_at > NOW()`,
    [id]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function createSession(userId: string): Promise<Session> {
  const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const expiresAt = new Date(Date.now() + config.cookie.maxAge);

  await query(
    `INSERT INTO sessions (id, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [id, userId, expiresAt.toISOString()]
  );

  return { id, userId, expiresAt, createdAt: new Date() };
}

export async function deleteSession(id: string): Promise<void> {
  await query('DELETE FROM sessions WHERE id = $1', [id]);
}

export const sessionRepository = {
  findById: findSessionById,
  create: createSession,
  delete: deleteSession,
};
