import { query } from '../unified-client.js';
import { snowflakeId } from '../../lib/snowflake.js';

export interface Series {
  id: string;
  authorId: string;
  authorName?: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  status: string;
  scenarioCount?: number;
  createdAt: string;
  updatedAt: string;
}

export async function findById(id: string): Promise<Series | null> {
  const result = await query<any>(
    `SELECT s.*, u.name as author_name,
            (SELECT COUNT(*) FROM series_scenarios ss WHERE ss.series_id = s.id) as scenario_count
     FROM series s JOIN users u ON u.id = s.author_id
     WHERE s.id = $1 AND s.status != 'deleted'`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return rowToSeries(result.rows[0]);
}

export async function findByAuthor(authorId: string): Promise<Series[]> {
  const result = await query<any>(
    `SELECT s.*, u.name as author_name,
            (SELECT COUNT(*) FROM series_scenarios ss WHERE ss.series_id = s.id) as scenario_count
     FROM series s JOIN users u ON u.id = s.author_id
     WHERE s.author_id = $1 AND s.status != 'deleted'
     ORDER BY s.updated_at DESC`,
    [authorId]
  );
  return result.rows.map(rowToSeries);
}

export async function create(params: {
  authorId: string;
  title: string;
  description: string;
}): Promise<Series> {
  const id = snowflakeId();
  await query(
    `INSERT INTO series (id, author_id, title, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [id, params.authorId, params.title, params.description]
  );
  return (await findById(id))!;
}

export async function update(id: string, params: Partial<{
  title: string;
  description: string;
  coverImageUrl: string;
}>): Promise<void> {
  const sets: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let i = 1;
  if (params.title !== undefined) { sets.push(`title = $${i++}`); values.push(params.title); }
  if (params.description !== undefined) { sets.push(`description = $${i++}`); values.push(params.description); }
  if (params.coverImageUrl !== undefined) { sets.push(`cover_image_url = $${i++}`); values.push(params.coverImageUrl); }
  values.push(id);
  await query(`UPDATE series SET ${sets.join(', ')} WHERE id = $${i}`, values);
}

export async function addScenario(seriesId: string, scenarioId: string, order?: number): Promise<void> {
  const maxOrder = await query<{ max_order: number }>(
    'SELECT COALESCE(MAX(display_order), 0) as max_order FROM series_scenarios WHERE series_id = $1',
    [seriesId]
  );
  const displayOrder = order ?? (maxOrder.rows[0]?.max_order ?? 0) + 1;
  await query(
    'INSERT INTO series_scenarios (series_id, scenario_id, display_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [seriesId, scenarioId, displayOrder]
  );
  await query('UPDATE scenarios SET series_id = $1 WHERE id = $2', [seriesId, scenarioId]);
}

export async function removeScenario(seriesId: string, scenarioId: string): Promise<void> {
  await query('DELETE FROM series_scenarios WHERE series_id = $1 AND scenario_id = $2', [seriesId, scenarioId]);
  await query('UPDATE scenarios SET series_id = NULL WHERE id = $1 AND series_id = $2', [scenarioId, seriesId]);
}

export async function getScenarios(seriesId: string): Promise<any[]> {
  const result = await query<any>(
    `SELECT s.*, ss.display_order, u.name as author_name
     FROM series_scenarios ss
     JOIN scenarios s ON s.id = ss.scenario_id
     JOIN users u ON u.id = s.author_id
     WHERE ss.series_id = $1 AND s.status != 'deleted'
     ORDER BY ss.display_order`,
    [seriesId]
  );
  return result.rows;
}

function rowToSeries(row: any): Series {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    status: row.status,
    scenarioCount: row.scenario_count,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export const seriesRepository = { findById, findByAuthor, create, update, addScenario, removeScenario, getScenarios };
