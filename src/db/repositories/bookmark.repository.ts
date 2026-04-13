import { query } from '../unified-client.js';

export async function isBookmarked(scenarioId: string, userId: string): Promise<boolean> {
  const result = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM bookmarks WHERE scenario_id = $1 AND user_id = $2',
    [scenarioId, userId]
  );
  return (result.rows[0]?.count ?? 0) > 0;
}

export async function toggle(scenarioId: string, userId: string): Promise<boolean> {
  const exists = await isBookmarked(scenarioId, userId);

  if (exists) {
    await query('DELETE FROM bookmarks WHERE scenario_id = $1 AND user_id = $2', [scenarioId, userId]);
    await query(
      'UPDATE scenario_stats SET bookmark_count = CASE WHEN bookmark_count > 0 THEN bookmark_count - 1 ELSE 0 END, updated_at = NOW() WHERE scenario_id = $1',
      [scenarioId]
    );
    return false;
  }

  await query(
    'INSERT INTO bookmarks (scenario_id, user_id, created_at) VALUES ($1, $2, NOW())',
    [scenarioId, userId]
  );
  await query(
    'UPDATE scenario_stats SET bookmark_count = bookmark_count + 1, updated_at = NOW() WHERE scenario_id = $1',
    [scenarioId]
  );
  return true;
}

export async function findByUser(userId: string): Promise<string[]> {
  const result = await query<{ scenario_id: string }>(
    'SELECT scenario_id FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows.map(r => r.scenario_id);
}

export const bookmarkRepository = {
  isBookmarked,
  toggle,
  findByUser,
};
