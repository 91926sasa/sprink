import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

type RateLimitType = 'auth' | 'global';

const RATE_LIMITS: Record<RateLimitType, number> = {
  auth: 20,
  global: 120,
};

function getRateLimitType(req: Request): RateLimitType {
  if (req.path.includes('/auth/')) return 'auth';
  return 'global';
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIP = getClientIP(req);
  const limitType = getRateLimitType(req);
  const limit = RATE_LIMITS[limitType];
  const windowMs = 60000;

  const key = `${clientIP}:${limitType}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
  } else {
    entry.count++;
  }

  const remaining = Math.max(0, limit - entry.count);
  const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(entry.resetAt / 1000)));

  if (entry.count > limit) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: `レート制限を超えました。${resetSeconds}秒後に再試行してください。`,
      retryAfter: resetSeconds,
    });
    return;
  }

  next();
}
