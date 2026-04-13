import { query } from '../unified-client.js';

export async function follow(followerId: string, followingId: string): Promise<void> {
  await query(
    'INSERT INTO follows (follower_id, following_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
    [followerId, followingId]
  );
  await query('UPDATE users SET follower_count = follower_count + 1 WHERE id = $1', [followingId]);
}

export async function unfollow(followerId: string, followingId: string): Promise<void> {
  const result = await query(
    'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  );
  if ((result.rowCount ?? 0) > 0) {
    await query(
      'UPDATE users SET follower_count = CASE WHEN follower_count > 0 THEN follower_count - 1 ELSE 0 END WHERE id = $1',
      [followingId]
    );
  }
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const result = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  );
  return (result.rows[0]?.count ?? 0) > 0;
}

export async function getFollowers(userId: string, offset = 0, limit = 20): Promise<{ users: any[]; total: number }> {
  const countResult = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM follows WHERE following_id = $1', [userId]
  );
  const result = await query<any>(
    `SELECT u.id, u.name, u.avatar_url, u.bio, u.scenario_count
     FROM follows f JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = $1 ORDER BY f.created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return { users: result.rows, total: countResult.rows[0]?.count ?? 0 };
}

export async function getFollowing(userId: string, offset = 0, limit = 20): Promise<{ users: any[]; total: number }> {
  const countResult = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1', [userId]
  );
  const result = await query<any>(
    `SELECT u.id, u.name, u.avatar_url, u.bio, u.scenario_count
     FROM follows f JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = $1 ORDER BY f.created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return { users: result.rows, total: countResult.rows[0]?.count ?? 0 };
}

export const followRepository = { follow, unfollow, isFollowing, getFollowers, getFollowing };
