import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { likeRepository } from '../db/repositories/like.repository.js';
import { scenarioRepository } from '../db/repositories/scenario.repository.js';
import { notificationRepository } from '../db/repositories/notification.repository.js';

export const likeRouter = Router();

// POST /scenarios/:id/like — Toggle like
likeRouter.post('/scenarios/:id/like', requireAuth, async (req, res) => {
  try {
    const scenario = await scenarioRepository.findById(req.params.id);
    if (!scenario) {
      sendError(res, 404, 'not_found', 'Scenario not found');
      return;
    }

    const isNowLiked = await likeRepository.toggle(req.params.id, req.user!.id);

    if (isNowLiked && scenario.authorId !== req.user!.id) {
      await notificationRepository.create({
        userId: scenario.authorId,
        type: 'new_like',
        actorId: req.user!.id,
        targetType: 'scenario',
        targetId: scenario.id,
        message: `${req.user!.name}さんが「${scenario.title}」にいいねしました`,
      });
    }

    sendSuccess(res, { liked: isNowLiked });
  } catch (err) {
    console.error('[Like] Error:', err);
    sendError(res, 500, 'internal_error', 'Failed to toggle like');
  }
});

// GET /scenarios/:id/like — Check like status
likeRouter.get('/scenarios/:id/like', requireAuth, async (req, res) => {
  try {
    const liked = await likeRepository.isLiked(req.params.id, req.user!.id);
    const count = await likeRepository.getLikeCount(req.params.id);
    sendSuccess(res, { liked, count });
  } catch (err) {
    console.error('[Like] Check error:', err);
    sendError(res, 500, 'internal_error', 'Failed to check like');
  }
});
