import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { reviewRepository } from '../db/repositories/review.repository.js';
import { scenarioRepository } from '../db/repositories/scenario.repository.js';

export const reviewRouter = Router();

// GET /scenarios/:id/reviews
reviewRouter.get('/scenarios/:id/reviews', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await reviewRepository.findByScenario(req.params.id, offset, limit);
    sendSuccess(res, result.items, {
      pagination: {
        total: result.total,
        offset,
        limit,
        has_more: result.total > offset + result.items.length,
      },
    });
  } catch (err) {
    console.error('[Reviews] List error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch reviews');
  }
});

// POST /scenarios/:id/reviews
reviewRouter.post('/scenarios/:id/reviews', requireAuth, async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const userId = req.user!.id;

    // Check scenario exists
    const scenario = await scenarioRepository.findById(scenarioId);
    if (!scenario) {
      sendError(res, 404, 'not_found', 'Scenario not found');
      return;
    }

    // No self-review
    if (scenario.authorId === userId) {
      sendError(res, 400, 'validation_error', '自分のシナリオにはレビューできません');
      return;
    }

    const { rating, title, body, spoiler } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      sendError(res, 400, 'validation_error', 'Rating must be 1-5');
      return;
    }

    // Check existing review
    const existing = await reviewRepository.findUserReview(scenarioId, userId);
    if (existing) {
      await reviewRepository.update(scenarioId, userId, {
        rating,
        title: title || '',
        body: body || '',
        spoiler: !!spoiler,
      });
    } else {
      await reviewRepository.create({
        scenarioId,
        userId,
        rating,
        title: title || '',
        body: body || '',
        spoiler: !!spoiler,
      });
    }

    await reviewRepository.recalculateStats(scenarioId);

    sendSuccess(res, { success: true }, { status: existing ? 200 : 201 });
  } catch (err) {
    console.error('[Reviews] Create error:', err);
    sendError(res, 500, 'internal_error', 'Failed to create review');
  }
});

// DELETE /scenarios/:id/reviews/mine
reviewRouter.delete('/scenarios/:id/reviews/mine', requireAuth, async (req, res) => {
  try {
    const scenarioId = req.params.id;
    const userId = req.user!.id;

    await reviewRepository.delete(scenarioId, userId);
    await reviewRepository.recalculateStats(scenarioId);

    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Reviews] Delete error:', err);
    sendError(res, 500, 'internal_error', 'Failed to delete review');
  }
});

// GET /reviews/mine
reviewRouter.get('/reviews/mine', requireAuth, async (req, res) => {
  try {
    const reviews = await reviewRepository.findByUser(req.user!.id);
    sendSuccess(res, reviews);
  } catch (err) {
    console.error('[Reviews] My reviews error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch reviews');
  }
});
