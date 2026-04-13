import { query } from '../unified-client.js';
import { snowflakeId } from '../../lib/snowflake.js';

export interface Comment {
  id: string;
  scenarioId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  parentId: string | null;
  body: string;
  spoiler: boolean;
  edited: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export async function findByScenario(
  scenarioId: string, offset = 0, limit = 50
): Promise<{ items: Comment[]; total: number }> {
  const countResult = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM comments WHERE scenario_id = $1 AND parent_id IS NULL AND deleted = $2',
    [scenarioId, false]
  );

  const result = await query<any>(
    `SELECT c.*, u.name as user_name, u.avatar_url as user_avatar_url
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.scenario_id = $1 AND c.parent_id IS NULL AND c.deleted = $2
     ORDER BY c.created_at DESC LIMIT $3 OFFSET $4`,
    [scenarioId, false, limit, offset]
  );

  const items: Comment[] = [];
  for (const row of result.rows) {
    const comment = rowToComment(row);
    // Fetch replies
    const repliesResult = await query<any>(
      `SELECT c.*, u.name as user_name, u.avatar_url as user_avatar_url
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.parent_id = $1 AND c.deleted = $2
       ORDER BY c.created_at ASC`,
      [row.id, false]
    );
    comment.replies = repliesResult.rows.map(rowToComment);
    items.push(comment);
  }

  return { items, total: countResult.rows[0]?.count ?? 0 };
}

export async function create(params: {
  scenarioId: string;
  userId: string;
  parentId?: string;
  body: string;
  spoiler: boolean;
}): Promise<string> {
  const id = snowflakeId();
  await query(
    `INSERT INTO comments (id, scenario_id, user_id, parent_id, body, spoiler, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [id, params.scenarioId, params.userId, params.parentId ?? null, params.body, params.spoiler]
  );

  await query(
    'UPDATE scenario_stats SET comment_count = comment_count + 1, updated_at = NOW() WHERE scenario_id = $1',
    [params.scenarioId]
  );

  return id;
}

export async function update(id: string, userId: string, body: string): Promise<void> {
  await query(
    'UPDATE comments SET body = $1, edited = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4',
    [body, true, id, userId]
  );
}

export async function softDelete(id: string, userId: string): Promise<void> {
  const comment = await query<{ scenario_id: string }>(
    'SELECT scenario_id FROM comments WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (comment.rows.length === 0) return;

  await query('UPDATE comments SET deleted = $1, body = $2, updated_at = NOW() WHERE id = $3', [true, '[削除済み]', id]);
  await query(
    'UPDATE scenario_stats SET comment_count = CASE WHEN comment_count > 0 THEN comment_count - 1 ELSE 0 END, updated_at = NOW() WHERE scenario_id = $1',
    [comment.rows[0].scenario_id]
  );
}

function rowToComment(row: any): Comment {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    userId: row.user_id,
    userName: row.user_name ?? 'Unknown',
    userAvatarUrl: row.user_avatar_url ?? undefined,
    parentId: row.parent_id,
    body: row.body,
    spoiler: typeof row.spoiler === 'number' ? row.spoiler !== 0 : !!row.spoiler,
    edited: typeof row.edited === 'number' ? row.edited !== 0 : !!row.edited,
    deleted: typeof row.deleted === 'number' ? row.deleted !== 0 : !!row.deleted,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export const commentRepository = { findByScenario, create, update, softDelete };
