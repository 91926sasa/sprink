import { Router } from 'express';
import { sendSuccess, sendError } from '../lib/response.js';
import { requireAuth } from '../middleware/auth.js';
import { seriesRepository } from '../db/repositories/series.repository.js';

export const seriesRouter = Router();

// GET /series/:id
seriesRouter.get('/series/:id', async (req, res) => {
  try {
    const series = await seriesRepository.findById(req.params.id);
    if (!series) {
      sendError(res, 404, 'not_found', 'Series not found');
      return;
    }
    const scenarios = await seriesRepository.getScenarios(req.params.id);
    sendSuccess(res, { series, scenarios });
  } catch (err) {
    console.error('[Series] Detail error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch series');
  }
});

// GET /series/mine
seriesRouter.get('/series/mine', requireAuth, async (req, res) => {
  try {
    const seriesList = await seriesRepository.findByAuthor(req.user!.id);
    sendSuccess(res, seriesList);
  } catch (err) {
    console.error('[Series] Mine error:', err);
    sendError(res, 500, 'internal_error', 'Failed to fetch series');
  }
});

// POST /series
seriesRouter.post('/series', requireAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || typeof title !== 'string') {
      sendError(res, 400, 'validation_error', 'Title is required');
      return;
    }
    const series = await seriesRepository.create({
      authorId: req.user!.id,
      title: title.trim(),
      description: description?.trim() || '',
    });
    sendSuccess(res, series, { status: 201 });
  } catch (err) {
    console.error('[Series] Create error:', err);
    sendError(res, 500, 'internal_error', 'Failed to create series');
  }
});

// PUT /series/:id
seriesRouter.put('/series/:id', requireAuth, async (req, res) => {
  try {
    const series = await seriesRepository.findById(req.params.id);
    if (!series || series.authorId !== req.user!.id) {
      sendError(res, 404, 'not_found', 'Series not found');
      return;
    }
    await seriesRepository.update(req.params.id, req.body);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Series] Update error:', err);
    sendError(res, 500, 'internal_error', 'Failed to update series');
  }
});

// POST /series/:id/scenarios
seriesRouter.post('/series/:id/scenarios', requireAuth, async (req, res) => {
  try {
    const series = await seriesRepository.findById(req.params.id);
    if (!series || series.authorId !== req.user!.id) {
      sendError(res, 403, 'forbidden', 'Not the series owner');
      return;
    }
    const { scenarioId, order } = req.body;
    await seriesRepository.addScenario(req.params.id, scenarioId, order);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Series] Add scenario error:', err);
    sendError(res, 500, 'internal_error', 'Failed to add scenario');
  }
});

// DELETE /series/:id/scenarios/:scenarioId
seriesRouter.delete('/series/:seriesId/scenarios/:scenarioId', requireAuth, async (req, res) => {
  try {
    const series = await seriesRepository.findById(req.params.seriesId);
    if (!series || series.authorId !== req.user!.id) {
      sendError(res, 403, 'forbidden', 'Not the series owner');
      return;
    }
    await seriesRepository.removeScenario(req.params.seriesId, req.params.scenarioId);
    sendSuccess(res, { success: true });
  } catch (err) {
    console.error('[Series] Remove scenario error:', err);
    sendError(res, 500, 'internal_error', 'Failed to remove scenario');
  }
});
