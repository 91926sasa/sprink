import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { query } from '../db/unified-client.js';

export const rankingRouter = Router();

// GET /rankings
rankingRouter.get('/rankings', async (req, res) => {
  try {
    const type = (req.query.type as string) || 'popular';
    const period = (req.query.period as string) || 'all';
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

    let orderBy: string;
    switch (type) {
      case 'trending': orderBy = 'ss.weekly_views DESC'; break;
      case 'rating': orderBy = 'ss.avg_rating DESC, ss.review_count DESC'; break;
      case 'likes': orderBy = 'ss.like_count DESC'; break;
      case 'bookmarks': orderBy = 'ss.bookmark_count DESC'; break;
      case 'reviews': orderBy = 'ss.review_count DESC'; break;
      case 'newest': orderBy = 's.published_at DESC'; break;
      default: orderBy = 'ss.view_count DESC';
    }

    let dateFilter = '';
    const values: unknown[] = [limit];
    if (period === 'week') {
      dateFilter = "AND s.published_at > datetime('now', '-7 days')";
    } else if (period === 'month') {
      dateFilter = "AND s.published_at > datetime('now', '-30 days')";
    }

    const result = await query<any>(
      `SELECT s.id, s.title, s.description, s.system_tag, s.genre,
              s.player_count_min, s.player_count_max, s.published_at, s.spoiler_level,
              u.id as author_id, u.name as author_name, u.avatar_url as author_avatar_url,
              COALESCE(ss.avg_rating, 0) as avg_rating,
              COALESCE(ss.review_count, 0) as review_count,
              COALESCE(ss.view_count, 0) as view_count,
              COALESCE(ss.bookmark_count, 0) as bookmark_count,
              COALESCE(ss.like_count, 0) as like_count,
              COALESCE(ss.weekly_views, 0) as weekly_views
       FROM scenarios s
       JOIN users u ON u.id = s.author_id
       LEFT JOIN scenario_stats ss ON ss.scenario_id = s.id
       WHERE s.status = 'published' AND s.visibility = 'public' ${dateFilter}
       ORDER BY ${orderBy}
       LIMIT $1`,
      values
    );

    const items = result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      id: row.id,
      title: row.title,
      description: row.description,
      systemTag: row.system_tag,
      genre: row.genre,
      playerCountMin: row.player_count_min,
      playerCountMax: row.player_count_max,
      authorId: row.author_id,
      authorName: row.author_name,
      authorAvatarUrl: row.author_avatar_url,
      avgRating: row.avg_rating,
      reviewCount: row.review_count,
      viewCount: row.view_count,
      bookmarkCount: row.bookmark_count,
      likeCount: row.like_count,
      weeklyViews: row.weekly_views,
      spoilerLevel: row.spoiler_level,
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    }));

    sendSuccess(res, { type, period, items });
  } catch (err) {
    console.error('[Rankings] Error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch rankings');
  }
});
