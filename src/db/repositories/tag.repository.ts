import { query } from '../unified-client.js';
import { snowflakeId } from '../../lib/snowflake.js';

export interface Tag {
  id: string;
  name: string;
  category: string;
  displayOrder: number;
  usageCount: number;
}

export async function findAll(): Promise<Tag[]> {
  const result = await query<{
    id: string; name: string; category: string; display_order: number; usage_count: number;
  }>('SELECT * FROM tags ORDER BY category, usage_count DESC, name');

  return result.rows.map(r => ({
    id: r.id, name: r.name, category: r.category,
    displayOrder: r.display_order, usageCount: r.usage_count,
  }));
}

export async function findByCategory(category: string): Promise<Tag[]> {
  const result = await query<{
    id: string; name: string; category: string; display_order: number; usage_count: number;
  }>('SELECT * FROM tags WHERE category = $1 ORDER BY usage_count DESC, name', [category]);

  return result.rows.map(r => ({
    id: r.id, name: r.name, category: r.category,
    displayOrder: r.display_order, usageCount: r.usage_count,
  }));
}

export async function findPopular(limit: number = 20): Promise<Tag[]> {
  const result = await query<{
    id: string; name: string; category: string; display_order: number; usage_count: number;
  }>('SELECT * FROM tags WHERE usage_count > 0 ORDER BY usage_count DESC LIMIT $1', [limit]);

  return result.rows.map(r => ({
    id: r.id, name: r.name, category: r.category,
    displayOrder: r.display_order, usageCount: r.usage_count,
  }));
}

export async function findOrCreate(name: string, category: string): Promise<Tag> {
  const existing = await query<{
    id: string; name: string; category: string; display_order: number; usage_count: number;
  }>('SELECT * FROM tags WHERE name = $1', [name]);

  if (existing.rows.length > 0) {
    const r = existing.rows[0];
    return { id: r.id, name: r.name, category: r.category, displayOrder: r.display_order, usageCount: r.usage_count };
  }

  const id = snowflakeId();
  await query(
    'INSERT INTO tags (id, name, category, created_at) VALUES ($1, $2, $3, NOW())',
    [id, name, category]
  );

  return { id, name, category, displayOrder: 0, usageCount: 0 };
}

export async function syncScenarioTags(scenarioId: string, tagIds: string[]): Promise<void> {
  await query('DELETE FROM scenario_tags WHERE scenario_id = $1', [scenarioId]);
  for (const tagId of tagIds) {
    await query(
      'INSERT INTO scenario_tags (scenario_id, tag_id) VALUES ($1, $2)',
      [scenarioId, tagId]
    );
  }
}

export async function recalculateUsageCounts(): Promise<void> {
  await query(`
    UPDATE tags SET usage_count = (
      SELECT COUNT(*) FROM scenario_tags st
      JOIN scenarios s ON s.id = st.scenario_id
      WHERE st.tag_id = tags.id AND s.status = 'published'
    )
  `);
}

export const tagRepository = {
  findAll,
  findByCategory,
  findPopular,
  findOrCreate,
  syncScenarioTags,
  recalculateUsageCounts,
};
