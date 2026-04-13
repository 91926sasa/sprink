import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { playReportRepository } from '../db/repositories/play-report.repository.js';

export const playReportRouter = Router();

// GET /scenarios/:id/play-reports
playReportRouter.get('/scenarios/:id/play-reports', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await playReportRepository.findByScenario(req.params.id, offset, limit);
    sendSuccess(res, result.items, {
      pagination: { total: result.total, offset, limit, has_more: result.total > offset + result.items.length },
    });
  } catch (err) {
    console.error('[PlayReports] List error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch play reports');
  }
});

// POST /scenarios/:id/play-reports
playReportRouter.post('/scenarios/:id/play-reports', requireAuth, async (req, res) => {
  try {
    const { title, body, playerCount, playDate, durationMinutes, spoiler } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      sendError(res, 400, 'validation_error', 'Title is required');
      return;
    }

    const id = await playReportRepository.create({
      scenarioId: req.params.id,
      userId: req.user!.id,
      title: title.trim(),
      body: body?.trim() || '',
      playerCount,
      playDate,
      durationMinutes,
      spoiler: !!spoiler,
    });

    sendSuccess(res, { id }, { status: 201 });
  } catch (err) {
    console.error('[PlayReports] Create error:', err);
    sendError(res, 500, 'internal_error', 'Failed to create play report');
  }
});

// DELETE /play-reports/:id
playReportRouter.delete('/play-reports/:id', requireAuth, async (req, res) => {
  try {
    await playReportRepository.delete(req.params.id, req.user!.id);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[PlayReports] Delete error:', err);
    sendError(res, 500, 'internal_error', 'Failed to delete play report');
  }
});
