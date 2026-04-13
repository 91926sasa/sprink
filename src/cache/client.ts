import Redis from 'ioredis';
import { config } from '../lib/config.js';

export const redis = new Redis.default(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message);
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export async function connectRedis(): Promise<void> {
  if (redis.status === 'ready') return;
  await redis.connect();
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error('[Redis] setCache error:', err);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error('[Redis] deleteCache error:', err);
  }
}
