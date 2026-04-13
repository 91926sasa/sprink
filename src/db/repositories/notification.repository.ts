import { query } from '../unified-client.js';
import { snowflakeId } from '../../lib/snowflake.js';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  actorId: string | null;
  actorName?: string;
  actorAvatarUrl?: string;
  targetType: string | null;
  targetId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export async function create(params: {
  userId: string;
  type: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  message: string;
}): Promise<void> {
  // Don't notify yourself
  if (params.actorId === params.userId) return;

  const id = snowflakeId();
  await query(
    `INSERT INTO notifications (id, user_id, type, actor_id, target_type, target_id, message, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [id, params.userId, params.type, params.actorId ?? null, params.targetType ?? null, params.targetId ?? null, params.message]
  );
}

export async function findByUser(
  userId: string, offset = 0, limit = 30
): Promise<{ items: Notification[]; total: number; unreadCount: number }> {
  const countResult = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1', [userId]
  );
  const unreadResult = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = $2', [userId, false]
  );
  const result = await query<any>(
    `SELECT n.*, u.name as actor_name, u.avatar_url as actor_avatar_url
     FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    items: result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorAvatarUrl: row.actor_avatar_url,
      targetType: row.target_type,
      targetId: row.target_id,
      message: row.message,
      read: typeof row.read === 'number' ? row.read !== 0 : !!row.read,
      createdAt: new Date(row.created_at).toISOString(),
    })),
    total: countResult.rows[0]?.count ?? 0,
    unreadCount: unreadResult.rows[0]?.count ?? 0,
  };
}

export async function markAsRead(userId: string, notificationId?: string): Promise<void> {
  if (notificationId) {
    await query('UPDATE notifications SET read = $1 WHERE id = $2 AND user_id = $3', [true, notificationId, userId]);
  } else {
    await query('UPDATE notifications SET read = $1 WHERE user_id = $2', [true, userId]);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = $2', [userId, false]
  );
  return result.rows[0]?.count ?? 0;
}

export const notificationRepository = { create, findByUser, markAsRead, getUnreadCount };
