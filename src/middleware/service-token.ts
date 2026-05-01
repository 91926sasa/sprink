import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { sendError } from '../lib/response.js';

const SERVICE_TOKEN = process.env.SERVICE_TOKEN || '';

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function requireServiceToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = req.headers['x-service-token'] as string || '';
  if (!SERVICE_TOKEN || !safeCompare(token, SERVICE_TOKEN)) {
    sendError(res, 401, 'service_token_required', 'Valid service token required');
    return;
  }

  const onBehalfOf = req.headers['x-on-behalf-of'] as string || '';
  if (onBehalfOf) {
    (req as Request & { serviceUser?: { sub: string } }).serviceUser = { sub: onBehalfOf };
  }

  next();
}
