import { query } from '../unified-client.js';
import { snowflakeId } from '../../lib/snowflake.js';

export interface PlayReport {
  id: string;
  scenarioId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  title: string;
  body: string;
  playerCount: number | null;
  playDate: string | null;
  durationMinutes: number | null;
  spoiler: boolean;
  createdAt: string;
}

export async function findByScenario(scenarioId: string, offset = 0, limit = 20): Promise<{ items: PlayReport[]; total: number }> {
  const countResult = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM play_reports WHERE scenario_id = $1', [scenarioId]
  );
  const result = await query<any>(
    `SELECT pr.*, u.name as user_name, u.avatar_url as user_avatar_url
     FROM play_reports pr JOIN users u ON u.id = pr.user_id
     WHERE pr.scenario_id = $1
     ORDER BY pr.created_at DESC LIMIT $2 OFFSET $3`,
    [scenarioId, limit, offset]
  );
  return {
    items: result.rows.map(rowToPlayReport),
    total: countResult.rows[0]?.count ?? 0,
  };
}

export async function create(params: {
  scenarioId: string;
  userId: string;
  title: string;
  body: string;
  playerCount?: number;
  playDate?: string;
  durationMinutes?: number;
  spoiler: boolean;
}): Promise<string> {
  const id = snowflakeId();
  await query(
    `INSERT INTO play_reports (id, scenario_id, user_id, title, body, player_count, play_date, duration_minutes, spoiler, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
    [id, params.scenarioId, params.userId, params.title, params.body,
     params.playerCount ?? null, params.playDate ?? null, params.durationMinutes ?? null, params.spoiler]
  );
  return id;
}

export async function deleteReport(id: string, userId: string): Promise<void> {
  await query('DELETE FROM play_reports WHERE id = $1 AND user_id = $2', [id, userId]);
}

function rowToPlayReport(row: any): PlayReport {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    userId: row.user_id,
    userName: row.user_name ?? 'Unknown',
    userAvatarUrl: row.user_avatar_url ?? undefined,
    title: row.title,
    body: row.body,
    playerCount: row.player_count,
    playDate: row.play_date,
    durationMinutes: row.duration_minutes,
    spoiler: typeof row.spoiler === 'number' ? row.spoiler !== 0 : !!row.spoiler,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export const playReportRepository = { findByScenario, create, delete: deleteReport };
