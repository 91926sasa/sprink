import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { notificationRepository } from '../db/repositories/notification.repository.js';

export const notificationRouter = Router();

// GET /notifications
notificationRouter.get('/notifications', requireAuth, async (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 30;
    const result = await notificationRepository.findByUser(req.user!.id, offset, limit);
    sendSuccess(res, {
      items: result.items,
      unreadCount: result.unreadCount,
    }, {
      pagination: { total: result.total, offset, limit, has_more: result.total > offset + result.items.length },
    });
  } catch (err) {
    console.error('[Notifications] List error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch notifications');
  }
});

// GET /notifications/unread-count
notificationRouter.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await notificationRepository.getUnreadCount(req.user!.id);
    sendSuccess(res, { count });
  } catch (err) {
    console.error('[Notifications] Count error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch count');
  }
});

// POST /notifications/mark-read
notificationRouter.post('/notifications/mark-read', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.body;
    await notificationRepository.markAsRead(req.user!.id, notificationId);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Notifications] Mark read error:', err);
    sendError(res, 500, 'internal_error', 'Failed to mark as read');
  }
});
