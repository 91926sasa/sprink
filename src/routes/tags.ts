import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { tagRepository } from '../db/repositories/tag.repository.js';
import { requireAuth } from '../middleware/auth.js';

export const tagRouter = Router();

tagRouter.get('/tags', async (req, res) => {
  try {
    const { category } = req.query;
    const tags = category
      ? await tagRepository.findByCategory(category as string)
      : await tagRepository.findAll();
    sendSuccess(res, tags);
  } catch (err) {
    console.error('[Tags] List error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch tags');
  }
});

tagRouter.get('/tags/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const tags = await tagRepository.findPopular(limit);
    sendSuccess(res, tags);
  } catch (err) {
    console.error('[Tags] Popular error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch popular tags');
  }
});

tagRouter.post('/tags', requireAuth, async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !category) {
      sendError(res, 400, 'validation_error', 'Name and category are required');
      return;
    }
    const tag = await tagRepository.findOrCreate(name, category);
    sendSuccess(res, tag, { status: 201 });
  } catch (err) {
    console.error('[Tags] Create error:', err);
    sendError(res, 500, 'internal_error', 'Failed to create tag');
  }
});
