import { Request, Response, NextFunction } from 'express';
import { ANONYMOUS_FACTS } from '../types/domain/facts.js';
import { sendError } from '../lib/response.js';
import { config } from '../lib/config.js';
import { getUserFromSession } from '../services/session.service.js';
import type { User, UserFacts } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userFacts: UserFacts;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const cookieName = config.cookie.name;
  const sessionId = req.cookies?.[cookieName];

  req.userFacts = ANONYMOUS_FACTS;

  if (sessionId) {
    try {
      const result = await getUserFromSession(sessionId);
      if (result) {
        req.user = result.user;
        req.userFacts = result.facts;
      }
    } catch (err) {
      console.error('[Auth] Session lookup failed:', err);
    }
  }

  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendError(res, 401, 'authentication_required', 'Authentication required', 'NEED_LOGIN');
    return;
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendError(res, 401, 'authentication_required', 'Authentication required');
    return;
  }
  if (config.isDev) {
    next();
    return;
  }
  if (req.userFacts.verification?.identity !== 'active') {
    sendError(res, 403, 'forbidden', 'Admin access required');
    return;
  }
  next();
}
