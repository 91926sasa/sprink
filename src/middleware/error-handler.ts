import { Request, Response, NextFunction } from 'express';
import { sendError } from '../lib/response.js';
import { config } from '../lib/config.js';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'not_found', `Endpoint not found: ${req.method} ${req.path}`);
}

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId ?? 'no-id';
  const userId = (req as unknown as { user?: { id: string } }).user?.id ?? 'anon';

  console.error(
    `[Sprink Error] rid=${requestId} uid=${userId} ${req.method} ${req.path}:`,
    err.message
  );
  if (!config.isDev) {
    console.error(`[Sprink Error] rid=${requestId} stack:`, err.stack);
  }

  sendError(
    res,
    500,
    'internal_error',
    config.isDev ? err.message : 'An internal error occurred'
  );
}
