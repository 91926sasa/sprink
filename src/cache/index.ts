export {
  redis,
  connectRedis,
  closeRedis,
  checkRedisConnection,
  getCache,
  setCache,
  deleteCache,
} from './client.js';

export { cacheKeys, cacheTTL } from './keys.js';

export async function invalidateSessionCache(sessionId: string): Promise<void> {
  const { deleteCache } = await import('./client.js');
  const { cacheKeys } = await import('./keys.js');
  await deleteCache(cacheKeys.session(sessionId));
}
