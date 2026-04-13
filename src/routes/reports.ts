import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { reportRepository } from '../db/repositories/report.repository.js';

export const reportRouter = Router();

// POST /reports — Submit a report
reportRouter.post('/reports', requireAuth, async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    const validTypes = ['scenario', 'review', 'comment', 'user'];
    const validReasons = ['spam', 'harassment', 'copyright', 'inappropriate', 'spoiler', 'other'];

    if (!validTypes.includes(targetType)) {
      sendError(res, 400, 'validation_error', 'Invalid target type');
      return;
    }
    if (!validReasons.includes(reason)) {
      sendError(res, 400, 'validation_error', 'Invalid reason');
      return;
    }

    const id = await reportRepository.create({
      reporterId: req.user!.id,
      targetType,
      targetId,
      reason,
      description: description || '',
    });

    sendSuccess(res, { id }, { status: 201 });
  } catch (err) {
    console.error('[Reports] Create error:', err);
    sendError(res, 500, 'internal_error', 'Failed to submit report');
  }
});

// GET /admin/reports — List pending reports (admin only)
reportRouter.get('/admin/reports', requireAdmin, async (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await reportRepository.findPending(offset, limit);
    sendSuccess(res, result.items, {
      pagination: { total: result.total, offset, limit, has_more: result.total > offset + result.items.length },
    });
  } catch (err) {
    console.error('[Reports] List error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch reports');
  }
});

// PATCH /admin/reports/:id — Resolve a report (admin only)
reportRouter.patch('/admin/reports/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      sendError(res, 400, 'validation_error', 'Invalid status');
      return;
    }
    await reportRepository.resolve(req.params.id, req.user!.id, status);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Reports] Resolve error:', err);
    sendError(res, 500, 'internal_error', 'Failed to resolve report');
  }
});
