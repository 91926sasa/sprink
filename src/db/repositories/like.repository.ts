import { query } from '../unified-client.js';

export async function toggle(scenarioId: string, userId: string): Promise<boolean> {
  const existing = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM likes WHERE scenario_id = $1 AND user_id = $2',
    [scenarioId, userId]
  );

  if ((existing.rows[0]?.count ?? 0) > 0) {
    await query('DELETE FROM likes WHERE scenario_id = $1 AND user_id = $2', [scenarioId, userId]);
    await query(
      'UPDATE scenario_stats SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END, updated_at = NOW() WHERE scenario_id = $1',
      [scenarioId]
    );
    return false;
  }

  await query(
    'INSERT INTO likes (scenario_id, user_id, created_at) VALUES ($1, $2, NOW())',
    [scenarioId, userId]
  );
  await query(
    'UPDATE scenario_stats SET like_count = like_count + 1, updated_at = NOW() WHERE scenario_id = $1',
    [scenarioId]
  );
  return true;
}

export async function isLiked(scenarioId: string, userId: string): Promise<boolean> {
  const result = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM likes WHERE scenario_id = $1 AND user_id = $2',
    [scenarioId, userId]
  );
  return (result.rows[0]?.count ?? 0) > 0;
}

export async function getLikeCount(scenarioId: string): Promise<number> {
  const result = await query<{ like_count: number }>(
    'SELECT like_count FROM scenario_stats WHERE scenario_id = $1',
    [scenarioId]
  );
  return result.rows[0]?.like_count ?? 0;
}

export const likeRepository = { toggle, isLiked, getLikeCount };
