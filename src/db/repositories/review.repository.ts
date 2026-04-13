import { query } from '../unified-client.js';
import { snowflakeId } from '../../lib/snowflake.js';
import type { Review } from '../../types/domain/review.js';

interface ReviewRow {
  id: string;
  scenario_id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  rating: number;
  title: string;
  body: string;
  spoiler: boolean | number;
  created_at: Date;
  updated_at: Date;
}

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    userId: row.user_id,
    userName: row.user_name ?? 'Unknown',
    userAvatarUrl: row.user_avatar_url ?? undefined,
    rating: row.rating,
    title: row.title,
    body: row.body,
    spoiler: typeof row.spoiler === 'number' ? row.spoiler !== 0 : !!row.spoiler,
    createdAt: new Date(row.created_at as any).toISOString(),
    updatedAt: new Date(row.updated_at as any).toISOString(),
  };
}

export async function findByScenario(scenarioId: string, offset = 0, limit = 20): Promise<{ items: Review[]; total: number }> {
  const countResult = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM reviews WHERE scenario_id = $1',
    [scenarioId]
  );

  const result = await query<ReviewRow>(
    `SELECT r.*, u.name as user_name, u.avatar_url as user_avatar_url
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.scenario_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [scenarioId, limit, offset]
  );

  return {
    items: result.rows.map(rowToReview),
    total: countResult.rows[0]?.count ?? 0,
  };
}

export async function findByUser(userId: string): Promise<Review[]> {
  const result = await query<ReviewRow>(
    `SELECT r.*, u.name as user_name, u.avatar_url as user_avatar_url
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return result.rows.map(rowToReview);
}

export async function findUserReview(scenarioId: string, userId: string): Promise<Review | null> {
  const result = await query<ReviewRow>(
    `SELECT r.*, u.name as user_name, u.avatar_url as user_avatar_url
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.scenario_id = $1 AND r.user_id = $2`,
    [scenarioId, userId]
  );
  if (result.rows.length === 0) return null;
  return rowToReview(result.rows[0]);
}

export async function create(review: {
  scenarioId: string;
  userId: string;
  rating: number;
  title: string;
  body: string;
  spoiler: boolean;
}): Promise<string> {
  const id = snowflakeId();
  await query(
    `INSERT INTO reviews (id, scenario_id, user_id, rating, title, body, spoiler, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
    [id, review.scenarioId, review.userId, review.rating, review.title, review.body, review.spoiler]
  );
  return id;
}

export async function updateReview(scenarioId: string, userId: string, updates: {
  rating: number;
  title: string;
  body: string;
  spoiler: boolean;
}): Promise<void> {
  await query(
    `UPDATE reviews SET rating = $1, title = $2, body = $3, spoiler = $4, updated_at = NOW()
     WHERE scenario_id = $5 AND user_id = $6`,
    [updates.rating, updates.title, updates.body, updates.spoiler, scenarioId, userId]
  );
}

export async function deleteReview(scenarioId: string, userId: string): Promise<void> {
  await query(
    'DELETE FROM reviews WHERE scenario_id = $1 AND user_id = $2',
    [scenarioId, userId]
  );
}

export async function recalculateStats(scenarioId: string): Promise<void> {
  await query(
    `UPDATE scenario_stats SET
      avg_rating = COALESCE((SELECT AVG(rating)::float FROM reviews WHERE scenario_id = $1), 0),
      review_count = (SELECT COUNT(*) FROM reviews WHERE scenario_id = $1),
      updated_at = NOW()
     WHERE scenario_id = $1`,
    [scenarioId]
  );
}

export const reviewRepository = {
  findByScenario,
  findByUser,
  findUserReview,
  create,
  update: updateReview,
  delete: deleteReview,
  recalculateStats,
};
