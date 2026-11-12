/**
 * Redis-backed distributed sliding-window & exponential backoff rate limiter
 * with automatic in-memory fallback when Redis is unavailable.
 *
 * Supports two independent protection layers controlled via `.env`:
 * 1. Auth Rate Limiter (`AUTH_RATELIMIT_ENABLED`): login burst, registration, OTP, and account lockouts (1h -> 24h)
 * 2. Global Page Rate Limiter (`PAGE_RATELIMIT_ENABLED`): protects all pages in proxy.ts against bots (5m -> 24h escalation)
 */

import {
  getErrorMessage,
  getReadyRedisClient,
  markRedisOffline,
  onRedisCacheFlush,
  onRedisReady,
  prefixRedisKey,
} from "./redis/client";

interface RateLimitRecord {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

interface ExponentialLockoutRecord {
  failedAttempts: number;
  lockedUntil: number; // Unix timestamp in ms
  tier: number;        // Escalation tier (1 = base, 2 = 2x, 3 = 4x, ...)
  lastAttemptAt: number;
}

const globalRef = globalThis as unknown as {
  __rateLimitStore?: Map<string, RateLimitRecord>;
  __expLockoutStore?: Map<string, ExponentialLockoutRecord>;
  __rateLimitCleanupTimer?: NodeJS.Timeout;
  __rateLimitReadyListener?: boolean;
};

const store = globalRef.__rateLimitStore ?? new Map<string, RateLimitRecord>();
const expStore =
  globalRef.__expLockoutStore ?? new Map<string, ExponentialLockoutRecord>();

globalRef.__rateLimitStore = store;
globalRef.__expLockoutStore = expStore;

if (!globalRef.__rateLimitReadyListener) {
  globalRef.__rateLimitReadyListener = true;
  const clearOfflineStores = () => {
    store.clear();
    expStore.clear();
  };
  onRedisReady(clearOfflineStores);
  onRedisCacheFlush(clearOfflineStores);
}

// Automatically prune expired fallback keys every 5 minutes
if (!globalRef.__rateLimitCleanupTimer) {
  globalRef.__rateLimitCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }

    for (const [key, record] of expStore.entries()) {
      if (record.lockedUntil <= now && now - record.lastAttemptAt > 24 * 3600 * 1000) {
        expStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (globalRef.__rateLimitCleanupTimer.unref) {
    globalRef.__rateLimitCleanupTimer.unref();
  }
}

const INCREMENT_WINDOW_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
end
local ttl = redis.call("TTL", KEYS[1])
if ttl < 0 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

export interface ExponentialLockoutOptions {
  threshold: number;         // Failed attempts before first lockout (e.g. 5 for account, 15 for IP, 1 for burst)
  baseLockSeconds?: number;  // Default: 3600 (1 hour)
  maxLockSeconds?: number;   // Default: 24 * 3600 (24 hours)
  decaySeconds?: number;     // Reset record if inactive this long. Default: 24 * 3600
}

export interface PageRateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  baseBlockSeconds: number;
}

export interface PageRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
  formattedDuration: string;
  tier: number;
  reason: "disabled" | "ok" | "active_block" | "window_exceeded";
}

function buildWindowRedisKey(key: string): string {
  return prefixRedisKey(`rl:win:${key}`);
}

function buildExpRedisKey(key: string): string {
  return prefixRedisKey(`rl:exp:${key}`);
}

function parseEnvBoolean(rawValue: string | undefined, defaultValue: boolean): boolean {
  const raw = rawValue?.trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw !== "false" && raw !== "0" && raw !== "no" && raw !== "off";
}

function parseEnvPositiveInt(rawValue: string | undefined, fallback: number): number {
  const raw = rawValue?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

/**
 * Controlled by `.env` `AUTH_RATELIMIT_ENABLED` ("true" / "false"). Defaults to true.
 */
export function isAuthRateLimitEnabled(): boolean {
  return parseEnvBoolean(process.env.AUTH_RATELIMIT_ENABLED, true);
}

/**
 * Controlled by `.env` `PAGE_RATELIMIT_ENABLED` ("true" / "false"). Defaults to true.
 */
export function isPageRateLimitEnabled(): boolean {
  return parseEnvBoolean(process.env.PAGE_RATELIMIT_ENABLED, true);
}

/**
 * Read global page-wide rate limit policy from `.env` with safe standard defaults:
 * - 60 page requests per 60-second window per IP
 * - 300-second (5-minute) base block escalating up to 24 hours on persistent bot traffic
 */
export function getPageRateLimitConfig(): PageRateLimitConfig {
  return {
    maxRequests: parseEnvPositiveInt(process.env.PAGE_RATELIMIT_MAX_REQUESTS, 60),
    windowSeconds: parseEnvPositiveInt(process.env.PAGE_RATELIMIT_WINDOW_SECONDS, 60),
    baseBlockSeconds: parseEnvPositiveInt(process.env.PAGE_RATELIMIT_BLOCK_SECONDS, 300),
  };
}

/**
 * Format duration in seconds to a human-readable English string.
 * Examples: "5 minutes", "1 hour", "2 hours", "4 hours", "8 hours"
 */
export function formatSecondsToHumanReadable(seconds: number): string {
  if (seconds <= 0) return "a moment";

  const totalMinutes = Math.max(1, Math.ceil(seconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${hours} hour${hours === 1 ? "" : "s"} ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
}

async function readExpRecord(key: string): Promise<ExponentialLockoutRecord | null> {
  const redis = await getReadyRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(buildExpRedisKey(key));
      if (!raw) return null;
      return JSON.parse(raw) as ExponentialLockoutRecord;
    } catch (err: unknown) {
      markRedisOffline(getErrorMessage(err, "Redis exp read failed"));
    }
  }
  return expStore.get(key) ?? null;
}

async function writeExpRecord(
  key: string,
  record: ExponentialLockoutRecord,
  ttlSeconds: number
): Promise<void> {
  const redis = await getReadyRedisClient();
  if (redis) {
    try {
      await redis.set(buildExpRedisKey(key), JSON.stringify(record), "EX", Math.max(60, ttlSeconds));
      return;
    } catch (err: unknown) {
      markRedisOffline(getErrorMessage(err, "Redis exp write failed"));
    }
  }
  expStore.set(key, record);
}

async function _checkExponentialLockout(key: string): Promise<{
  locked: boolean;
  resetInSeconds: number;
  formattedDuration: string;
  tier: number;
}> {
  const now = Date.now();
  const record = await readExpRecord(key);

  if (!record || record.lockedUntil <= now) {
    return {
      locked: false,
      resetInSeconds: 0,
      formattedDuration: "",
      tier: record?.tier ?? 0,
    };
  }

  const resetInSeconds = Math.max(1, Math.ceil((record.lockedUntil - now) / 1000));
  return {
    locked: true,
    resetInSeconds,
    formattedDuration: formatSecondsToHumanReadable(resetInSeconds),
    tier: record.tier,
  };
}

async function _recordExponentialFailure(
  key: string,
  options: ExponentialLockoutOptions
): Promise<{
  locked: boolean;
  resetInSeconds: number;
  formattedDuration: string;
  attempts: number;
  threshold: number;
  tier: number;
}> {
  const now = Date.now();
  const baseSeconds = options.baseLockSeconds ?? 3600;
  const maxSeconds = options.maxLockSeconds ?? 24 * 3600;
  const decaySeconds = options.decaySeconds ?? 24 * 3600;
  const decayMs = decaySeconds * 1000;

  let record = await readExpRecord(key);

  if (!record || (record.lockedUntil <= now && now - record.lastAttemptAt > decayMs)) {
    record = {
      failedAttempts: 1,
      lockedUntil: 0,
      tier: 0,
      lastAttemptAt: now,
    };
  } else {
    record = {
      ...record,
      failedAttempts: record.failedAttempts + 1,
      lastAttemptAt: now,
    };
  }

  if (record.failedAttempts >= options.threshold) {
    record.tier = Math.max(1, record.tier + 1);
    const multiplier = Math.pow(2, record.tier - 1);
    const lockDurationSeconds = Math.min(baseSeconds * multiplier, maxSeconds);
    record.lockedUntil = now + lockDurationSeconds * 1000;

    await writeExpRecord(key, record, Math.max(decaySeconds, lockDurationSeconds) + 60);

    return {
      locked: true,
      resetInSeconds: lockDurationSeconds,
      formattedDuration: formatSecondsToHumanReadable(lockDurationSeconds),
      attempts: record.failedAttempts,
      threshold: options.threshold,
      tier: record.tier,
    };
  }

  await writeExpRecord(key, record, decaySeconds + 60);
  return {
    locked: false,
    resetInSeconds: 0,
    formattedDuration: "",
    attempts: record.failedAttempts,
    threshold: options.threshold,
    tier: record.tier,
  };
}

async function _recordSpamWhileLocked(
  key: string,
  options: ExponentialLockoutOptions
): Promise<{
  resetInSeconds: number;
  formattedDuration: string;
  tier: number;
}> {
  const now = Date.now();
  const baseSeconds = options.baseLockSeconds ?? 3600;
  const maxSeconds = options.maxLockSeconds ?? 24 * 3600;
  const decaySeconds = options.decaySeconds ?? 24 * 3600;

  let record = await readExpRecord(key);
  if (!record) {
    record = {
      failedAttempts: options.threshold,
      lockedUntil: now + baseSeconds * 1000,
      tier: 1,
      lastAttemptAt: now,
    };
  } else {
    const nextTier = Math.min(record.tier + 1, 10);
    const multiplier = Math.pow(2, nextTier - 1);
    const lockDurationSeconds = Math.min(baseSeconds * multiplier, maxSeconds);

    record = {
      ...record,
      tier: nextTier,
      failedAttempts: record.failedAttempts + 1,
      lastAttemptAt: now,
      lockedUntil: now + lockDurationSeconds * 1000,
    };
  }

  const remainingSec = Math.max(1, Math.ceil((record.lockedUntil - now) / 1000));
  await writeExpRecord(key, record, Math.max(decaySeconds, remainingSec) + 60);

  return {
    resetInSeconds: remainingSec,
    formattedDuration: formatSecondsToHumanReadable(remainingSec),
    tier: record.tier,
  };
}

async function _isRateLimited(
  key: string,
  limit: number
): Promise<{ limited: boolean; remaining: number; resetInSeconds: number }> {
  const redis = await getReadyRedisClient();
  if (redis) {
    try {
      const redisKey = buildWindowRedisKey(key);
      const res = await redis.pipeline().get(redisKey).ttl(redisKey).exec();
      const rawCount = res?.[0]?.[1];
      const rawTtl = res?.[1]?.[1];

      if (rawCount === null || rawCount === undefined) {
        return { limited: false, remaining: limit, resetInSeconds: 0 };
      }

      const count = Number(rawCount);
      const ttl = typeof rawTtl === "number" && rawTtl > 0 ? rawTtl : 1;
      const remaining = Math.max(0, limit - count);

      return {
        limited: count >= limit,
        remaining,
        resetInSeconds: ttl,
      };
    } catch (err: unknown) {
      markRedisOffline(getErrorMessage(err, "Redis window check failed"));
    }
  }

  const now = Date.now();
  const record = store.get(key);

  if (!record || record.resetAt <= now) {
    return { limited: false, remaining: limit, resetInSeconds: 0 };
  }

  const remaining = Math.max(0, limit - record.count);
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

  return {
    limited: record.count >= limit,
    remaining,
    resetInSeconds,
  };
}

async function _incrementRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = await getReadyRedisClient();
  if (redis) {
    try {
      const redisKey = buildWindowRedisKey(key);
      const res = (await redis.eval(
        INCREMENT_WINDOW_LUA,
        1,
        redisKey,
        String(windowSeconds)
      )) as [number, number];

      const count = Number(res?.[0] ?? 1);
      const ttl = Math.max(1, Number(res?.[1] ?? windowSeconds));
      const remaining = Math.max(0, limit - count);

      if (count > limit) {
        return {
          success: false,
          remaining: 0,
          resetInSeconds: ttl,
        };
      }

      return {
        success: true,
        remaining,
        resetInSeconds: ttl,
      };
    } catch (err: unknown) {
      markRedisOffline(getErrorMessage(err, "Redis window increment failed"));
    }
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = store.get(key);

  if (!record || record.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      remaining: Math.max(0, limit - 1),
      resetInSeconds: windowSeconds,
    };
  }

  record.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  const remaining = Math.max(0, limit - record.count);

  if (record.count > limit) {
    return {
      success: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  return {
    success: true,
    remaining,
    resetInSeconds,
  };
}

/**
 * Auth Rate Limiter: Check if an auth key is under an active exponential lockout.
 */
export async function checkExponentialLockout(key: string) {
  if (!isAuthRateLimitEnabled()) {
    return { locked: false, resetInSeconds: 0, formattedDuration: "", tier: 0 };
  }
  return _checkExponentialLockout(key);
}

/**
 * Auth Rate Limiter: Record failed auth attempt with exponential backoff (1h -> 2h -> 4h -> ... -> 24h).
 */
export async function recordExponentialFailure(
  key: string,
  options: ExponentialLockoutOptions
) {
  if (!isAuthRateLimitEnabled()) {
    return {
      locked: false,
      resetInSeconds: 0,
      formattedDuration: "",
      attempts: 0,
      threshold: options.threshold,
      tier: 0,
    };
  }
  return _recordExponentialFailure(key, options);
}

/**
 * Auth Rate Limiter: Double lock duration when spamming auth while already locked.
 */
export async function recordSpamWhileLocked(
  key: string,
  options: ExponentialLockoutOptions
) {
  if (!isAuthRateLimitEnabled()) {
    return { resetInSeconds: 0, formattedDuration: "", tier: 0 };
  }
  return _recordSpamWhileLocked(key, options);
}

/**
 * Reset exponential lockout record (e.g. after successful login or password reset).
 */
export async function resetExponentialLockout(key: string): Promise<void> {
  expStore.delete(key);

  const redis = await getReadyRedisClient();
  if (!redis) return;

  try {
    await redis.unlink(buildExpRedisKey(key));
  } catch (err: unknown) {
    try {
      await redis.del(buildExpRedisKey(key));
    } catch {
      markRedisOffline(getErrorMessage(err, "Redis exp delete failed"));
    }
  }
}

/**
 * Auth Rate Limiter: Check sliding-window status without incrementing.
 */
export async function isRateLimited(key: string, limit: number) {
  if (!isAuthRateLimitEnabled()) {
    return { limited: false, remaining: limit, resetInSeconds: 0 };
  }
  return _isRateLimited(key, limit);
}

/**
 * Auth Rate Limiter: Atomic sliding-window increment via Redis Lua.
 */
export async function incrementRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!isAuthRateLimitEnabled()) {
    return {
      success: true,
      remaining: limit,
      resetInSeconds: windowSeconds,
    };
  }
  return _incrementRateLimit(key, limit, windowSeconds);
}

/**
 * Clear sliding-window rate limit key.
 */
export async function resetRateLimit(key: string): Promise<void> {
  store.delete(key);

  const redis = await getReadyRedisClient();
  if (!redis) return;

  try {
    await redis.unlink(buildWindowRedisKey(key));
  } catch (err: unknown) {
    try {
      await redis.del(buildWindowRedisKey(key));
    } catch {
      markRedisOffline(getErrorMessage(err, "Redis window reset failed"));
    }
  }
}

/**
 * Global Page Rate Limiter (used across all pages in proxy.ts):
 * Enforces a standard request budget per IP per window across all routes.
 * On excess traffic / bot scraping:
 * - 1st violation: blocks IP for `baseBlockSeconds` (default 300s / 5 minutes)
 * - Persistent requests while blocked or repeat breaches: escalates exponentially (5m -> 10m -> 20m -> ... -> 24h max)
 */
export async function enforcePageRateLimit(ip: string): Promise<PageRateLimitResult> {
  const config = getPageRateLimitConfig();

  if (!isPageRateLimitEnabled()) {
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetInSeconds: 0,
      formattedDuration: "",
      tier: 0,
      reason: "disabled",
    };
  }

  const lockKey = `page:lock:ip:${ip}`;
  const windowKey = `page:win:ip:${ip}`;

  const activeLock = await _checkExponentialLockout(lockKey);
  if (activeLock.locked) {
    const escalated = await _recordSpamWhileLocked(lockKey, {
      threshold: 1,
      baseLockSeconds: config.baseBlockSeconds,
      maxLockSeconds: 24 * 3600,
    });

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetInSeconds: escalated.resetInSeconds,
      formattedDuration: escalated.formattedDuration,
      tier: escalated.tier,
      reason: "active_block",
    };
  }

  const windowRes = await _incrementRateLimit(
    windowKey,
    config.maxRequests,
    config.windowSeconds
  );

  if (!windowRes.success) {
    const locked = await _recordExponentialFailure(lockKey, {
      threshold: 1,
      baseLockSeconds: config.baseBlockSeconds,
      maxLockSeconds: 24 * 3600,
    });
    await resetRateLimit(windowKey);

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetInSeconds: locked.resetInSeconds,
      formattedDuration: locked.formattedDuration,
      tier: locked.tier,
      reason: "window_exceeded",
    };
  }

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: windowRes.remaining,
    resetInSeconds: windowRes.resetInSeconds,
    formattedDuration: "",
    tier: activeLock.tier,
    reason: "ok",
  };
}

/**
 * Safely extract client IP from headers.
 */
export function getClientIp(
  headersLike: Headers | Record<string, string | string[] | undefined> | null | undefined
): string {
  if (!headersLike) return "127.0.0.1";

  let headerValue: string | string[] | null | undefined;
  if (typeof (headersLike as Headers).get === "function") {
    headerValue =
      (headersLike as Headers).get("x-forwarded-for") ||
      (headersLike as Headers).get("x-real-ip") ||
      (headersLike as Headers).get("cf-connecting-ip");
  } else {
    const map = headersLike as Record<string, string | string[] | undefined>;
    headerValue = map["x-forwarded-for"] || map["x-real-ip"] || map["cf-connecting-ip"];
  }

  if (Array.isArray(headerValue)) headerValue = headerValue[0];
  if (!headerValue || typeof headerValue !== "string") return "127.0.0.1";

  const firstIp = headerValue.split(",")[0].trim();
  return firstIp || "127.0.0.1";
}
