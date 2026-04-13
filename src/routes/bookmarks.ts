import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { bookmarkRepository } from '../db/repositories/bookmark.repository.js';
import { scenarioRepository } from '../db/repositories/scenario.repository.js';

export const bookmarkRouter = Router();

// GET /bookmarks — User's bookmarks
bookmarkRouter.get('/bookmarks', requireAuth, async (req, res) => {
  try {
    const scenarioIds = await bookmarkRepository.findByUser(req.user!.id);

    const scenarios = [];
    for (const id of scenarioIds) {
      const s = await scenarioRepository.findById(id);
      if (s && s.status === 'published') {
        scenarios.push(s);
      }
    }

    sendSuccess(res, scenarios);
  } catch (err) {
    console.error('[Bookmarks] List error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch bookmarks');
  }
});

// POST /scenarios/:id/bookmark — Toggle bookmark
bookmarkRouter.post('/scenarios/:id/bookmark', requireAuth, async (req, res) => {
  try {
    const scenario = await scenarioRepository.findById(req.params.id);
    if (!scenario) {
      sendError(res, 404, 'not_found', 'Scenario not found');
      return;
    }

    const isNowBookmarked = await bookmarkRepository.toggle(req.params.id, req.user!.id);
    sendSuccess(res, { bookmarked: isNowBookmarked });
  } catch (err) {
    console.error('[Bookmarks] Toggle error:', err);
    sendError(res, 500, 'internal_error', 'Failed to toggle bookmark');
  }
});

// GET /scenarios/:id/bookmark — Check bookmark status
bookmarkRouter.get('/scenarios/:id/bookmark', requireAuth, async (req, res) => {
  try {
    const bookmarked = await bookmarkRepository.isBookmarked(req.params.id, req.user!.id);
    sendSuccess(res, { bookmarked });
  } catch (err) {
    console.error('[Bookmarks] Check error:', err);
    sendError(res, 500, 'internal_error', 'Failed to check bookmark');
  }
});
