import { config } from '../lib/config.js';
import { sessions, mockUsers, mockUserFacts } from '../data/mock.js';
import { ANONYMOUS_FACTS, type UserFacts } from '../types/domain/facts.js';
import type { User } from '../types/index.js';

type DbModeType = 'mock' | 'sqlite' | 'pg';
let dbMode: DbModeType = 'mock';
let sessionRepo: typeof import('../db/repositories/session.repository.js').sessionRepository | null = null;
let userRepo: typeof import('../db/repositories/user.repository.js').userRepository | null = null;
let cacheModule: typeof import('../cache/index.js') | null = null;

export async function enableDbMode(mode: 'sqlite' | 'pg' = 'pg'): Promise<void> {
  try {
    const [sessionMod, userMod] = await Promise.all([
      import('../db/repositories/session.repository.js'),
      import('../db/repositories/user.repository.js'),
    ]);
    sessionRepo = sessionMod.sessionRepository;
    userRepo = userMod.userRepository;

    if (mode === 'pg') {
      const cacheMod = await import('../cache/index.js');
      cacheModule = cacheMod;
    }

    dbMode = mode;
    console.log(`[Sprink Session] DB mode enabled: ${mode}`);
  } catch (err) {
    console.error('[Sprink Session] Failed to enable DB mode, falling back to mock:', err);
    dbMode = 'mock';
  }
}

export async function getUserFromSession(
  sessionId: string
): Promise<{ user: User; facts: UserFacts } | null> {
  if (dbMode === 'pg' && sessionRepo && userRepo && cacheModule) {
    return getUserFromSessionPg(sessionId);
  }
  if (dbMode === 'sqlite' && sessionRepo && userRepo) {
    return getUserFromSessionSqlite(sessionId);
  }
  return getUserFromSessionMock(sessionId);
}

export async function createSession(userId: string): Promise<string> {
  if ((dbMode === 'sqlite' || dbMode === 'pg') && sessionRepo) {
    const session = await sessionRepo.create(userId);
    return session.id;
  }
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  sessions.set(sessionId, userId);
  return sessionId;
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (dbMode === 'pg' && sessionRepo && cacheModule) {
    await sessionRepo.delete(sessionId);
    await cacheModule.invalidateSessionCache(sessionId);
    return;
  }
  if (dbMode === 'sqlite' && sessionRepo) {
    await sessionRepo.delete(sessionId);
    return;
  }
  sessions.delete(sessionId);
}

function getUserFromSessionMock(
  sessionId: string
): { user: User; facts: UserFacts } | null {
  const userId = sessions.get(sessionId);
  if (!userId) return null;

  const user = mockUsers.get(userId);
  if (!user) return null;

  const facts = mockUserFacts.get(userId) ?? ANONYMOUS_FACTS;
  return { user, facts };
}

async function getUserFromSessionSqlite(
  sessionId: string
): Promise<{ user: User; facts: UserFacts } | null> {
  if (!sessionRepo || !userRepo) return null;

  const session = await sessionRepo.findById(sessionId);
  if (!session) return null;

  const user = await userRepo.findById(session.userId);
  if (!user) return null;

  const facts = await userRepo.getFacts(session.userId);
  return { user, facts };
}

async function getUserFromSessionPg(
  sessionId: string
): Promise<{ user: User; facts: UserFacts } | null> {
  if (!sessionRepo || !userRepo || !cacheModule) return null;

  const cacheKey = cacheModule.cacheKeys.session(sessionId);
  const cached = await cacheModule.getCache<{ userId: string }>(cacheKey);

  let userId: string;

  if (cached) {
    userId = cached.userId;
  } else {
    const session = await sessionRepo.findById(sessionId);
    if (!session) return null;
    userId = session.userId;
    await cacheModule.setCache(cacheKey, { userId }, cacheModule.cacheTTL.session);
  }

  const user = await userRepo.findById(userId);
  if (!user) return null;

  const factsKey = cacheModule.cacheKeys.userFacts(userId);
  let facts = await cacheModule.getCache<UserFacts>(factsKey);
  if (!facts) {
    facts = await userRepo.getFacts(userId);
    await cacheModule.setCache(factsKey, facts, cacheModule.cacheTTL.userFacts);
  }

  return { user, facts };
}
