import type Redis from "ioredis";
import {
  emitRedisCacheFlush,
  getErrorMessage,
  getReadyRedisClient,
  markRedisOffline,
  onRedisReady,
  prefixRedisKey,
} from "./client";

export function getDefaultRedisCacheTtlSeconds(): number {
  const raw = process.env.DEFAULT_REDIS_CACHE_TTL_SECONDS?.trim();
  if (!raw) return 3600;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 3600;
  return Math.floor(parsed);
}

export const DEFAULT_REDIS_CACHE_TTL_SECONDS = getDefaultRedisCacheTtlSeconds();

interface FallbackCacheEntry {
  serialized: string;
  expiresAt: number;
  tags: string[];
}

const globalForCache = globalThis as unknown as {
  __redisFallbackCache?: Map<string, FallbackCacheEntry>;
  __redisPendingFetches?: Map<string, Promise<unknown>>;
  __redisReadyFlushRegistered?: boolean;
};

const fallbackCache =
  globalForCache.__redisFallbackCache ?? new Map<string, FallbackCacheEntry>();
globalForCache.__redisFallbackCache = fallbackCache;

const pendingFetches =
  globalForCache.__redisPendingFetches ?? new Map<string, Promise<unknown>>();
globalForCache.__redisPendingFetches = pendingFetches;

// Clear offline fallback cache automatically once Redis comes online
if (!globalForCache.__redisReadyFlushRegistered) {
  globalForCache.__redisReadyFlushRegistered = true;
  onRedisReady(() => {
    fallbackCache.clear();
  });
}

function buildTagSetKey(tag: string): string {
  return prefixRedisKey(`cache:tag:${tag}`);
}

function buildCacheEntryKey(key: string): string {
  return prefixRedisKey(`cache:${key}`);
}

/**
 * Deterministic short hash for filter/search strings so Redis keys remain clean and bounded.
 */
export function hashCachePart(value: string): string {
  if (!value) return "empty";
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Generic Redis cache-aside wrapper with tag indexing & thundering-herd coalescing.
 * Stores values inside `{ v: data }` JSON envelopes so null/false/0 values cache cleanly.
 * Automatically falls back to in-memory TTL cache if Redis is temporarily unavailable.
 */
export async function getOrSetCache<T>(options: {
  key: string;
  tags?: string[];
  ttlSeconds?: number;
  fetcher: () => Promise<T>;
}): Promise<T> {
  const {
    key,
    tags = [],
    ttlSeconds = getDefaultRedisCacheTtlSeconds(),
    fetcher,
  } = options;
  const fullKey = buildCacheEntryKey(key);

  // 1. Try Redis first
  const redis = await getReadyRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(fullKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as { v: T };
        if (parsed && Object.prototype.hasOwnProperty.call(parsed, "v")) {
          return parsed.v;
        }
      }
    } catch (err: unknown) {
      markRedisOffline(getErrorMessage(err, "Redis GET failed"));
    }
  } else {
    // 2. Fallback in-memory check only while Redis is offline
    const now = Date.now();
    const mem = fallbackCache.get(fullKey);
    if (mem && mem.expiresAt > now) {
      const parsed = JSON.parse(mem.serialized) as { v: T };
      return parsed.v;
    }
    if (mem && mem.expiresAt <= now) {
      fallbackCache.delete(fullKey);
    }
  }

  // 3. Coalesce concurrent cache misses for the same key
  const inFlight = pendingFetches.get(fullKey);
  if (inFlight) {
    return (await inFlight) as T;
  }

  const fetchPromise = (async () => {
    const freshValue = await fetcher();
    const serialized = JSON.stringify({ v: freshValue });

    const activeRedis = await getReadyRedisClient();
    if (activeRedis) {
      try {
        const pipeline = activeRedis.pipeline();
        pipeline.set(fullKey, serialized, "EX", ttlSeconds);
        for (const tag of tags) {
          const tagKey = buildTagSetKey(tag);
          pipeline.sadd(tagKey, fullKey);
          pipeline.expire(tagKey, ttlSeconds + 300);
        }
        await pipeline.exec();
        return freshValue;
      } catch (err: unknown) {
        markRedisOffline(getErrorMessage(err, "Redis SET failed"));
      }
    }

    // Offline fallback storage
    fallbackCache.set(fullKey, {
      serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
    return freshValue;
  })();

  pendingFetches.set(fullKey, fetchPromise);
  try {
    return (await fetchPromise) as T;
  } finally {
    pendingFetches.delete(fullKey);
  }
}

async function unlinkRedisKeys(redis: Redis, keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  const CHUNK_SIZE = 500;
  let deleted = 0;

  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    const chunk = keys.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) continue;
    try {
      deleted += await redis.unlink(...chunk);
    } catch {
      deleted += await redis.del(...chunk);
    }
  }

  return deleted;
}

async function scanRedisKeysByPattern(redis: Redis, pattern: string): Promise<string[]> {
  const found = new Set<string>();
  let cursor = "0";
  let iterations = 0;
  const MAX_SCAN_ITERATIONS = 10_000;

  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      200
    );
    cursor = nextCursor;
    for (const k of batch) {
      found.add(k);
    }
    iterations++;
  } while (cursor !== "0" && iterations < MAX_SCAN_ITERATIONS);

  return Array.from(found);
}

/**
 * Invalidate exact cache keys in Redis (and offline fallback memory).
 */
export async function invalidateCacheKeys(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const fullKeys = keys.map(buildCacheEntryKey);

  for (const fullKey of fullKeys) {
    fallbackCache.delete(fullKey);
  }

  const redis = await getReadyRedisClient();
  if (!redis) return;

  try {
    await unlinkRedisKeys(redis, fullKeys);
  } catch (err: unknown) {
    markRedisOffline(getErrorMessage(err, "Redis key invalidation failed"));
  }
}

/**
 * Invalidate all cache entries associated with any of the given tags in O(M) using Redis Sets.
 * Replaces Next.js `revalidateTag(...)`.
 */
export async function invalidateCacheTags(...tags: string[]): Promise<void> {
  const uniqueTags = Array.from(new Set(tags.filter(Boolean)));
  if (uniqueTags.length === 0) return;

  // 1. Always clear matching entries from offline fallback map
  const tagSet = new Set(uniqueTags);
  for (const [entryKey, entry] of fallbackCache.entries()) {
    if (entry.tags.some((t) => tagSet.has(t))) {
      fallbackCache.delete(entryKey);
    }
  }

  // 2. Clear tracked keys + tag sets in Redis
  const redis = await getReadyRedisClient();
  if (!redis) return;

  try {
    const tagKeys = uniqueTags.map(buildTagSetKey);
    const readPipeline = redis.pipeline();
    for (const tagKey of tagKeys) {
      readPipeline.smembers(tagKey);
    }
    const results = await readPipeline.exec();

    const keysToDelete = new Set<string>(tagKeys);
    if (results) {
      for (const [err, members] of results) {
        if (!err && Array.isArray(members)) {
          for (const member of members) {
            if (typeof member === "string" && member.length > 0) {
              keysToDelete.add(member);
            }
          }
        }
      }
    }

    await unlinkRedisKeys(redis, Array.from(keysToDelete));
  } catch (err: unknown) {
    markRedisOffline(getErrorMessage(err, "Redis tag invalidation failed"));
  }
}

export interface InvalidateAllCacheResult {
  ok: true;
  mode: "redis" | "memory-fallback";
  clearedKeys: number;
  includeRateLimits: boolean;
}

/**
 * Count active keys currently stored in the active Redis DB (or fallback memory).
 */
export async function countRedisCacheKeys(): Promise<{
  mode: "redis" | "memory-fallback";
  count: number;
}> {
  const redis = await getReadyRedisClient();
  if (redis) {
    try {
      const count = await redis.dbsize();
      return { mode: "redis", count };
    } catch (err: unknown) {
      markRedisOffline(getErrorMessage(err, "Redis dbsize check failed"));
    }
  }

  return { mode: "memory-fallback", count: fallbackCache.size };
}

/**
 * Flush cached data from Redis (and offline fallback memory).
 * Defaults to flushing the entire active Redis database (`FLUSHDB`) so no stale cache or lock keys
 * from current or previous builds/prefixes remain. Pass `{ includeRateLimits: false }` to flush `cache:*` only.
 */
export async function invalidateAllRedisCache(options?: {
  includeRateLimits?: boolean;
}): Promise<InvalidateAllCacheResult> {
  const includeRateLimits = options?.includeRateLimits ?? true;
  const fallbackCount = fallbackCache.size;
  fallbackCache.clear();
  if (includeRateLimits) {
    emitRedisCacheFlush();
  }

  const redis = await getReadyRedisClient();
  if (!redis) {
    return {
      ok: true,
      mode: "memory-fallback",
      clearedKeys: fallbackCount,
      includeRateLimits,
    };
  }

  try {
    if (includeRateLimits) {
      const totalKeys = await redis.dbsize();
      await redis.flushdb();
      return {
        ok: true,
        mode: "redis",
        clearedKeys: totalKeys,
        includeRateLimits: true,
      };
    }

    const keys = await scanRedisKeysByPattern(redis, `${prefixRedisKey("cache:")}*`);
    const deleted = await unlinkRedisKeys(redis, keys);
    return {
      ok: true,
      mode: "redis",
      clearedKeys: deleted,
      includeRateLimits: false,
    };
  } catch (err: unknown) {
    markRedisOffline(getErrorMessage(err, "Redis full cache invalidation failed"));
    return {
      ok: true,
      mode: "memory-fallback",
      clearedKeys: fallbackCount,
      includeRateLimits,
    };
  }
}
