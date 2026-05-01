import { Router } from 'express';
import { requireServiceToken } from '../middleware/service-token.js';
import { sendSuccess, sendError } from '../lib/response.js';
import { scenarioRepository } from '../db/repositories/scenario.repository.js';

export const serviceRouter = Router();

serviceRouter.get('/service/scenarios/:id', requireServiceToken, async (req, res) => {
  const scenario = await scenarioRepository.findById(req.params.id);
  if (!scenario) {
    sendError(res, 404, 'not_found', 'Scenario not found');
    return;
  }

  sendSuccess(res, {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    authorId: scenario.authorId,
    systemTag: scenario.systemTag,
    visibility: scenario.visibility,
    status: scenario.status,
  });
});
