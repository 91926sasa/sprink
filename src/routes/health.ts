import { Router } from 'express';
import { sendSuccess } from '../lib/response.js';
import { checkConnection as checkDbConnection } from '../db/unified-client.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const dbOk = await checkDbConnection().catch(() => false);

  sendSuccess(res, {
    status: dbOk ? 'ok' : 'degraded',
    service: 'sprink',
    timestamp: new Date().toISOString(),
    connections: {
      database: dbOk ? 'ok' : 'error',
    },
  });
});
