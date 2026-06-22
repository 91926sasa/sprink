import { Router } from 'express';
import { requireServiceToken } from '../middleware/service-token.js';
import { sendSuccess, sendError } from '../lib/response.js';
import { scenarioRepository } from '../db/repositories/scenario.repository.js';
import { tagRepository } from '../db/repositories/tag.repository.js';
import { playReportRepository } from '../db/repositories/play-report.repository.js';
import { snowflakeId } from '../lib/snowflake.js';
import { generateCoverImage } from '../services/cover-image.service.js';
import { query } from '../db/client.js';

async function ensureServiceUser(userId: string): Promise<void> {
  await query(
    `INSERT INTO users (id, name, provider) VALUES ($1, $2, 'service')
     ON CONFLICT (id) DO NOTHING`,
    [userId, 'Virtual Writers']
  );
}

export const serviceRouter = Router();

serviceRouter.get('/service/scenarios/:id', requireServiceToken, async (req, res) => {
  const scenario = await scenarioRepository.findById(req.params.id);
  if (!scenario) {
    sendError(res, 404, 'not_found', 'Scenario not found');
    return;
  }

  sendSuccess(res, {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    authorId: scenario.authorId,
    systemTag: scenario.systemTag,
    visibility: scenario.visibility,
    status: scenario.status,
  });
});

serviceRouter.post('/service/scenarios', requireServiceToken, async (req, res) => {
  try {
    const {
      title, description, systemTag, genre,
      playerCountMin, playerCountMax, estimatedTime,
      chapters, spoilerLevel, tagNames, publish,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      sendError(res, 400, 'validation_error', 'Title is required');
      return;
    }

    const authorId = (req as any).serviceUser?.sub || 'user_writers';
    await ensureServiceUser(authorId);

    const validSpoilerLevels = ['none', 'mild', 'heavy'];
    const safeSpoilerLevel = validSpoilerLevels.includes(spoilerLevel) ? spoilerLevel : 'none';

    const id = snowflakeId();
    const scenario = await scenarioRepository.create({
      id,
      authorId,
      title: title.trim(),
      description: description?.trim() || '',
      systemTag: systemTag || '',
      genre: genre || '',
      playerCountMin: playerCountMin || 1,
      playerCountMax: playerCountMax || 4,
      estimatedTime: estimatedTime || null,
      chapters: chapters || [],
      spoilerLevel: safeSpoilerLevel,
    });

    if (tagNames && Array.isArray(tagNames)) {
      const tagIds: string[] = [];
      for (const name of tagNames) {
        const tag = await tagRepository.findOrCreate(name, 'other');
        tagIds.push(tag.id);
      }
      await tagRepository.syncScenarioTags(id, tagIds);
    }

    if (publish) {
      await scenarioRepository.updateStatus(id, 'published', 'public');
      await tagRepository.recalculateUsageCounts().catch(() => {});
      generateCoverImage(id).catch(err => {
        console.error('[Service] Cover image generation failed:', err);
      });
    }

    console.log(`[Service] Scenario created: id=${id} title="${title.trim()}" author=${authorId} published=${!!publish}`);
    sendSuccess(res, { id, title: title.trim(), status: publish ? 'published' : 'draft' }, { status: 201 });
  } catch (err) {
    console.error('[Service] Scenario create error:', err);
    sendError(res, 500, 'internal_error', 'Failed to create scenario');
  }
});

// POST /service/scenarios/:id/play-reports — サービストークンで「このシナリオで行ったセッション」を登録。
// mem の声つきリプレイへのリンク(memUrl/memSessionId)を受け、play_reports に mem 専用列が無いため body 末尾に
// Markdown で埋め込む（migration 不要の暫定。将来 mem_player_url 列を足すなら repository も拡張）。
serviceRouter.post('/service/scenarios/:id/play-reports', requireServiceToken, async (req, res) => {
  try {
    const { title, body, playerCount, playDate, durationMinutes, spoiler, memUrl, memSessionId } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      sendError(res, 400, 'validation_error', 'Title is required');
      return;
    }
    const scenario = await scenarioRepository.findById(req.params.id);
    if (!scenario) {
      sendError(res, 404, 'not_found', 'Scenario not found');
      return;
    }

    const userId = (req as any).serviceUser?.sub || 'user_writers';
    await ensureServiceUser(userId);

    let finalBody = (body?.trim() as string) || '';
    if (memUrl) {
      finalBody += `\n\n---\n▶ **声つきリプレイ (Me'm)**: ${memUrl}`;
      if (memSessionId) finalBody += `\n（session: ${memSessionId}）`;
    }

    const id = await playReportRepository.create({
      scenarioId: req.params.id,
      userId,
      title: title.trim(),
      body: finalBody,
      playerCount: playerCount ?? null,
      playDate: playDate ?? null,
      durationMinutes: durationMinutes ?? null,
      spoiler: !!spoiler,
    });

    console.log(`[Service] PlayReport created: id=${id} scenario=${req.params.id} mem=${memUrl ?? 'none'}`);
    sendSuccess(res, { id, scenarioId: req.params.id, memUrl: memUrl ?? null }, { status: 201 });
  } catch (err) {
    console.error('[Service] PlayReport create error:', err);
    sendError(res, 500, 'internal_error', 'Failed to create play report');
  }
});
