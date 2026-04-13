import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { followRepository } from '../db/repositories/follow.repository.js';
import { notificationRepository } from '../db/repositories/notification.repository.js';

export const followRouter = Router();

// POST /users/:id/follow — Toggle follow
followRouter.post('/users/:id/follow', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const followerId = req.user!.id;

    if (followerId === targetId) {
      sendError(res, 400, 'validation_error', '自分をフォローすることはできません');
      return;
    }

    const isCurrentlyFollowing = await followRepository.isFollowing(followerId, targetId);

    if (isCurrentlyFollowing) {
      await followRepository.unfollow(followerId, targetId);
    } else {
      await followRepository.follow(followerId, targetId);
      await notificationRepository.create({
        userId: targetId,
        type: 'new_follower',
        actorId: followerId,
        message: `${req.user!.name}さんにフォローされました`,
      });
    }

    sendSuccess(res, { following: !isCurrentlyFollowing });
  } catch (err) {
    console.error('[Follow] Error:', err);
    sendError(res, 500, 'internal_error', 'Failed to toggle follow');
  }
});

// GET /users/:id/followers
followRouter.get('/users/:id/followers', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await followRepository.getFollowers(req.params.id, offset, limit);
    sendSuccess(res, result.users, {
      pagination: { total: result.total, offset, limit, has_more: result.total > offset + result.users.length },
    });
  } catch (err) {
    console.error('[Follow] Followers error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch followers');
  }
});

// GET /users/:id/following
followRouter.get('/users/:id/following', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await followRepository.getFollowing(req.params.id, offset, limit);
    sendSuccess(res, result.users, {
      pagination: { total: result.total, offset, limit, has_more: result.total > offset + result.users.length },
    });
  } catch (err) {
    console.error('[Follow] Following error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch following');
  }
});
