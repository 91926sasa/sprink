import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { commentRepository } from '../db/repositories/comment.repository.js';
import { scenarioRepository } from '../db/repositories/scenario.repository.js';
import { notificationRepository } from '../db/repositories/notification.repository.js';

export const commentRouter = Router();

// GET /scenarios/:id/comments
commentRouter.get('/scenarios/:id/comments', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const result = await commentRepository.findByScenario(req.params.id, offset, limit);
    sendSuccess(res, result.items, {
      pagination: { total: result.total, offset, limit, has_more: result.total > offset + result.items.length },
    });
  } catch (err) {
    console.error('[Comments] List error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch comments');
  }
});

// POST /scenarios/:id/comments
commentRouter.post('/scenarios/:id/comments', requireAuth, async (req, res) => {
  try {
    const scenario = await scenarioRepository.findById(req.params.id);
    if (!scenario) {
      sendError(res, 404, 'not_found', 'Scenario not found');
      return;
    }

    const { body, spoiler, parentId } = req.body;
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      sendError(res, 400, 'validation_error', 'Comment body is required');
      return;
    }
    if (body.length > 2000) {
      sendError(res, 400, 'validation_error', 'Comment is too long (max 2000 characters)');
      return;
    }

    const commentId = await commentRepository.create({
      scenarioId: req.params.id,
      userId: req.user!.id,
      parentId,
      body: body.trim(),
      spoiler: !!spoiler,
    });

    // Notify scenario author
    if (scenario.authorId !== req.user!.id) {
      await notificationRepository.create({
        userId: scenario.authorId,
        type: parentId ? 'comment_reply' : 'new_comment',
        actorId: req.user!.id,
        targetType: 'scenario',
        targetId: scenario.id,
        message: `${req.user!.name}さんが「${scenario.title}」にコメントしました`,
      });
    }

    sendSuccess(res, { id: commentId }, { status: 201 });
  } catch (err) {
    console.error('[Comments] Create error:', err);
    sendError(res, 500, 'internal_error', 'Failed to create comment');
  }
});

// PUT /comments/:id
commentRouter.put('/comments/:id', requireAuth, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || body.trim().length === 0) {
      sendError(res, 400, 'validation_error', 'Comment body is required');
      return;
    }
    await commentRepository.update(req.params.id, req.user!.id, body.trim());
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Comments] Update error:', err);
    sendError(res, 500, 'internal_error', 'Failed to update comment');
  }
});

// DELETE /comments/:id
commentRouter.delete('/comments/:id', requireAuth, async (req, res) => {
  try {
    await commentRepository.softDelete(req.params.id, req.user!.id);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Comments] Delete error:', err);
    sendError(res, 500, 'internal_error', 'Failed to delete comment');
  }
});
