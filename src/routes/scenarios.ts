import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { scenarioRepository } from '../db/repositories/scenario.repository.js';
import { tagRepository } from '../db/repositories/tag.repository.js';
import { snowflakeId } from '../lib/snowflake.js';
import { generateCoverImage } from '../services/cover-image.service.js';

export const scenarioRouter = Router();

const SAFE_ID_RE = /^[A-Za-z0-9_-]+$/;

// GET /scenarios — List/search published scenarios
scenarioRouter.get('/scenarios', async (req, res) => {
  try {
    const { q, system, genre, tags, player_count, author, sort, offset, limit } = req.query;

    // Validate author (TRPGO user ID / OIDC sub)
    const authorTrpgoId = typeof author === 'string' && SAFE_ID_RE.test(author) ? author : undefined;

    const result = await scenarioRepository.search({
      q: q as string,
      systemTag: system as string,
      genre: genre as string,
      tags: tags ? (tags as string).split(',') : undefined,
      playerCount: player_count ? parseInt(player_count as string, 10) : undefined,
      authorTrpgoId,
      sort: (sort as any) || 'newest',
      offset: offset ? parseInt(offset as string, 10) : 0,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    sendSuccess(res, result.items, {
      pagination: {
        total: result.total,
        offset: offset ? parseInt(offset as string, 10) : 0,
        limit: limit ? parseInt(limit as string, 10) : 20,
        has_more: result.total > (offset ? parseInt(offset as string, 10) : 0) + result.items.length,
      },
    });
  } catch (err) {
    console.error('[Scenarios] Search error:', err);
    sendError(res, 500, 'internal_error', 'Failed to search scenarios');
  }
});

// GET /scenarios/mine — User's own scenarios
scenarioRouter.get('/scenarios/mine', requireAuth, async (req, res) => {
  try {
    const scenarios = await scenarioRepository.findByAuthor(req.user!.id);
    sendSuccess(res, scenarios);
  } catch (err) {
    console.error('[Scenarios] Mine error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch scenarios');
  }
});

// GET /scenarios/:id — Get scenario detail
scenarioRouter.get('/scenarios/:id', async (req, res) => {
  try {
    const scenario = await scenarioRepository.findById(req.params.id);
    if (!scenario) {
      sendError(res, 404, 'not_found', 'Scenario not found');
      return;
    }

    // Only author can see non-public scenarios
    if (scenario.visibility !== 'public' && scenario.status !== 'published') {
      if (!req.user || req.user.id !== scenario.authorId) {
        sendError(res, 404, 'not_found', 'Scenario not found');
        return;
      }
    }

    // Increment view count for published public scenarios
    if (scenario.status === 'published' && scenario.visibility === 'public') {
      await scenarioRepository.incrementViewCount(scenario.id).catch(() => {});
    }

    sendSuccess(res, scenario);
  } catch (err) {
    console.error('[Scenarios] Detail error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch scenario');
  }
});

// POST /scenarios — Create new scenario
scenarioRouter.post('/scenarios', requireAuth, async (req, res) => {
  try {
    const { title, description, systemTag, genre, playerCountMin, playerCountMax,
            estimatedTime, chapters, spoilerLevel, tagNames } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      sendError(res, 400, 'validation_error', 'Title is required');
      return;
    }

    const id = snowflakeId();
    const scenario = await scenarioRepository.create({
      id,
      authorId: req.user!.id,
      title: title.trim(),
      description: description?.trim() || '',
      systemTag: systemTag || '',
      genre: genre || '',
      playerCountMin: playerCountMin || 1,
      playerCountMax: playerCountMax || 4,
      estimatedTime: estimatedTime || null,
      chapters: chapters || [],
      spoilerLevel: spoilerLevel || 'none',
    });

    // Sync tags
    if (tagNames && Array.isArray(tagNames)) {
      const tagIds: string[] = [];
      for (const name of tagNames) {
        const tag = await tagRepository.findOrCreate(name, 'other');
        tagIds.push(tag.id);
      }
      await tagRepository.syncScenarioTags(id, tagIds);
    }

    sendSuccess(res, scenario, { status: 201 });
  } catch (err) {
    console.error('[Scenarios] Create error:', err);
    sendError(res, 500, 'internal_error', 'Failed to create scenario');
  }
});

// PUT /scenarios/:id — Update scenario
scenarioRouter.put('/scenarios/:id', requireAuth, async (req, res) => {
  try {
    const existing = await scenarioRepository.findById(req.params.id);
    if (!existing) {
      sendError(res, 404, 'not_found', 'Scenario not found');
      return;
    }
    if (existing.authorId !== req.user!.id) {
      sendError(res, 403, 'forbidden', 'Not the author');
      return;
    }

    const { title, description, systemTag, genre, playerCountMin, playerCountMax,
            estimatedTime, chapters, coverImageUrl, spoilerLevel, tagNames } = req.body;

    const updated = await scenarioRepository.update(req.params.id, {
      title, description, systemTag, genre, playerCountMin, playerCountMax,
      estimatedTime, chapters, coverImageUrl, spoilerLevel,
    });

    if (tagNames && Array.isArray(tagNames)) {
      const tagIds: string[] = [];
      for (const name of tagNames) {
        const tag = await tagRepository.findOrCreate(name, 'other');
        tagIds.push(tag.id);
      }
      await tagRepository.syncScenarioTags(req.params.id, tagIds);
    }

    sendSuccess(res, updated);
  } catch (err) {
    console.error('[Scenarios] Update error:', err);
    sendError(res, 500, 'internal_error', 'Failed to update scenario');
  }
});

// PATCH /scenarios/:id/status — Publish/archive/delete
scenarioRouter.patch('/scenarios/:id/status', requireAuth, async (req, res) => {
  try {
    const existing = await scenarioRepository.findById(req.params.id);
    if (!existing) {
      sendError(res, 404, 'not_found', 'Scenario not found');
      return;
    }
    if (existing.authorId !== req.user!.id) {
      sendError(res, 403, 'forbidden', 'Not the author');
      return;
    }

    const { status, visibility } = req.body;

    const validStatuses = ['draft', 'published', 'archived', 'deleted'];
    if (!validStatuses.includes(status)) {
      sendError(res, 400, 'validation_error', 'Invalid status');
      return;
    }

    await scenarioRepository.updateStatus(req.params.id, status, visibility);

    if (status === 'published') {
      await tagRepository.recalculateUsageCounts().catch(() => {});
      // カバー画像を非同期生成（レスポンスをブロックしない）
      generateCoverImage(req.params.id).catch(err => {
        console.error('[Scenarios] Cover image generation failed:', err);
      });
    }

    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Scenarios] Status update error:', err);
    sendError(res, 500, 'internal_error', 'Failed to update status');
  }
});
