import { query } from '../unified-client.js';
import type { Scenario, ScenarioSummary } from '../../types/domain/scenario.js';

interface ScenarioRow {
  id: string;
  author_id: string;
  title: string;
  description: string;
  system_tag: string;
  genre: string;
  player_count_min: number;
  player_count_max: number;
  estimated_time: string | null;
  chapters: any;
  cover_image_url: string | null;
  status: string;
  visibility: string;
  spoiler_level: string;
  version: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToScenario(row: ScenarioRow): Scenario {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    description: row.description,
    systemTag: row.system_tag,
    genre: row.genre,
    playerCountMin: row.player_count_min,
    playerCountMax: row.player_count_max,
    estimatedTime: row.estimated_time,
    chapters: typeof row.chapters === 'string' ? JSON.parse(row.chapters) : row.chapters ?? [],
    coverImageUrl: row.cover_image_url,
    status: row.status as Scenario['status'],
    visibility: row.visibility as Scenario['visibility'],
    spoilerLevel: row.spoiler_level as Scenario['spoilerLevel'],
    version: row.version,
    publishedAt: row.published_at ? new Date(row.published_at as any).toISOString() : null,
    createdAt: new Date(row.created_at as any).toISOString(),
    updatedAt: new Date(row.updated_at as any).toISOString(),
  };
}

export async function findById(id: string): Promise<Scenario | null> {
  const result = await query<ScenarioRow>(
    'SELECT * FROM scenarios WHERE id = $1 AND status != $2',
    [id, 'deleted']
  );
  if (result.rows.length === 0) return null;
  return rowToScenario(result.rows[0]);
}

export async function findByAuthor(authorId: string): Promise<Scenario[]> {
  const result = await query<ScenarioRow>(
    'SELECT * FROM scenarios WHERE author_id = $1 AND status != $2 ORDER BY updated_at DESC',
    [authorId, 'deleted']
  );
  return result.rows.map(rowToScenario);
}

export async function create(scenario: {
  id: string;
  authorId: string;
  title: string;
  description: string;
  systemTag: string;
  genre: string;
  playerCountMin: number;
  playerCountMax: number;
  estimatedTime: string | null;
  chapters: any[];
  spoilerLevel: string;
}): Promise<Scenario> {
  await query(
    `INSERT INTO scenarios (id, author_id, title, description, system_tag, genre,
     player_count_min, player_count_max, estimated_time, chapters, spoiler_level,
     created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
    [
      scenario.id, scenario.authorId, scenario.title, scenario.description,
      scenario.systemTag, scenario.genre, scenario.playerCountMin, scenario.playerCountMax,
      scenario.estimatedTime, JSON.stringify(scenario.chapters), scenario.spoilerLevel,
    ]
  );

  // Initialize stats
  await query(
    'INSERT INTO scenario_stats (scenario_id, updated_at) VALUES ($1, NOW())',
    [scenario.id]
  );

  return (await findById(scenario.id))!;
}

export async function update(id: string, updates: Partial<{
  title: string;
  description: string;
  systemTag: string;
  genre: string;
  playerCountMin: number;
  playerCountMax: number;
  estimatedTime: string | null;
  chapters: any[];
  coverImageUrl: string | null;
  spoilerLevel: string;
}>): Promise<Scenario | null> {
  const setClauses: string[] = ['updated_at = NOW()', 'version = version + 1'];
  const values: unknown[] = [];
  let i = 1;

  const fieldMap: Record<string, string> = {
    title: 'title',
    description: 'description',
    systemTag: 'system_tag',
    genre: 'genre',
    playerCountMin: 'player_count_min',
    playerCountMax: 'player_count_max',
    estimatedTime: 'estimated_time',
    coverImageUrl: 'cover_image_url',
    spoilerLevel: 'spoiler_level',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if ((updates as any)[key] !== undefined) {
      setClauses.push(`${col} = $${i++}`);
      values.push((updates as any)[key]);
    }
  }

  if (updates.chapters !== undefined) {
    setClauses.push(`chapters = $${i++}`);
    values.push(JSON.stringify(updates.chapters));
  }

  values.push(id);

  await query(
    `UPDATE scenarios SET ${setClauses.join(', ')} WHERE id = $${i}`,
    values
  );

  return findById(id);
}

export async function updateStatus(
  id: string,
  status: string,
  visibility?: string
): Promise<void> {
  const setClauses = ['status = $1', 'updated_at = NOW()'];
  const values: unknown[] = [status];
  let i = 2;

  if (visibility) {
    setClauses.push(`visibility = $${i++}`);
    values.push(visibility);
  }

  if (status === 'published') {
    setClauses.push(`published_at = COALESCE(published_at, NOW())`);
  }

  values.push(id);

  await query(
    `UPDATE scenarios SET ${setClauses.join(', ')} WHERE id = $${i}`,
    values
  );
}

interface SearchParams {
  q?: string;
  systemTag?: string;
  genre?: string;
  tags?: string[];
  playerCount?: number;
  /** TRPGO user ID (OIDC sub) でフィルター */
  authorTrpgoId?: string;
  sort?: 'newest' | 'popular' | 'rating' | 'trending';
  offset?: number;
  limit?: number;
}

export async function search(params: SearchParams): Promise<{ items: ScenarioSummary[]; total: number }> {
  const conditions: string[] = ["s.status = 'published'", "s.visibility = 'public'"];
  const values: unknown[] = [];
  let i = 1;

  if (params.q) {
    conditions.push(`(s.title LIKE $${i} OR s.description LIKE $${i})`);
    values.push(`%${params.q}%`);
    i++;
  }
  if (params.systemTag) {
    conditions.push(`s.system_tag = $${i++}`);
    values.push(params.systemTag);
  }
  if (params.genre) {
    conditions.push(`s.genre = $${i++}`);
    values.push(params.genre);
  }
  if (params.playerCount) {
    conditions.push(`s.player_count_min <= $${i} AND s.player_count_max >= $${i}`);
    values.push(params.playerCount);
    i++;
  }
  if (params.authorTrpgoId) {
    conditions.push(`u.trpgo_user_id = $${i++}`);
    values.push(params.authorTrpgoId);
  }

  let tagJoin = '';
  if (params.tags && params.tags.length > 0) {
    const tagPlaceholders = params.tags.map(() => `$${i++}`).join(', ');
    tagJoin = `INNER JOIN scenario_tags st ON st.scenario_id = s.id
               INNER JOIN tags t ON t.id = st.tag_id AND t.name IN (${tagPlaceholders})`;
    values.push(...params.tags);
  }

  const where = conditions.join(' AND ');

  // authorTrpgoId uses u.trpgo_user_id → need users JOIN in count query too
  const userJoinForCount = params.authorTrpgoId
    ? 'JOIN users u ON u.id = s.author_id'
    : '';

  // Count
  const countResult = await query<{ count: number }>(
    `SELECT COUNT(DISTINCT s.id) as count FROM scenarios s ${userJoinForCount} ${tagJoin} WHERE ${where}`,
    values
  );
  const total = countResult.rows[0]?.count ?? 0;

  // Sort
  let orderBy = 's.published_at DESC';
  switch (params.sort) {
    case 'popular': orderBy = 'ss.view_count DESC'; break;
    case 'rating': orderBy = 'ss.avg_rating DESC, ss.review_count DESC'; break;
    case 'trending': orderBy = 'ss.weekly_views DESC'; break;
    default: orderBy = 's.published_at DESC';
  }

  const offset = params.offset ?? 0;
  const limit = Math.min(params.limit ?? 20, 100);

  values.push(limit, offset);

  const result = await query<any>(
    `SELECT DISTINCT s.*, u.name as author_name, u.avatar_url as author_avatar_url,
            COALESCE(ss.avg_rating, 0) as avg_rating,
            COALESCE(ss.review_count, 0) as review_count,
            COALESCE(ss.view_count, 0) as view_count,
            COALESCE(ss.bookmark_count, 0) as bookmark_count
     FROM scenarios s
     LEFT JOIN users u ON u.id = s.author_id
     LEFT JOIN scenario_stats ss ON ss.scenario_id = s.id
     ${tagJoin}
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT $${i++} OFFSET $${i++}`,
    values
  );

  const items: ScenarioSummary[] = [];
  for (const row of result.rows) {
    // Get tags for each scenario
    const tagResult = await query<{ name: string }>(
      'SELECT t.name FROM scenario_tags st JOIN tags t ON t.id = st.tag_id WHERE st.scenario_id = $1',
      [row.id]
    );

    items.push({
      id: row.id,
      authorId: row.author_id,
      authorName: row.author_name ?? 'Unknown',
      authorAvatarUrl: row.author_avatar_url ?? undefined,
      title: row.title,
      description: row.description,
      systemTag: row.system_tag,
      genre: row.genre,
      playerCountMin: row.player_count_min,
      playerCountMax: row.player_count_max,
      estimatedTime: row.estimated_time,
      coverImageUrl: row.cover_image_url,
      status: row.status,
      spoilerLevel: row.spoiler_level,
      avgRating: row.avg_rating,
      reviewCount: row.review_count,
      viewCount: row.view_count,
      bookmarkCount: row.bookmark_count,
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      tags: tagResult.rows.map(t => t.name),
    });
  }

  return { items, total };
}

export async function incrementViewCount(scenarioId: string): Promise<void> {
  await query(
    `UPDATE scenario_stats SET view_count = view_count + 1, weekly_views = weekly_views + 1, updated_at = NOW()
     WHERE scenario_id = $1`,
    [scenarioId]
  );
}

export const scenarioRepository = {
  findById,
  findByAuthor,
  create,
  update,
  updateStatus,
  search,
  incrementViewCount,
};
