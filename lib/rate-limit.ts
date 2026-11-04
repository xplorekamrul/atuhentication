/**
 * In-memory sliding-window & exponential backoff rate limiter.
 * Supports intelligent progressive lockouts (1h -> 2h -> 4h -> 8h -> 24h)
 * to effectively stop high-speed bots, brute-force, and credential stuffing attacks.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

interface ExponentialLockoutRecord {
  failedAttempts: number;
  lockedUntil: number; // Unix timestamp in ms
  tier: number;        // Escalation tier (1 = 1h, 2 = 2h, 3 = 4h, 4 = 8h, etc.)
  lastAttemptAt: number;
}

// Preserve state across hot-module reloads in development
const globalRef = globalThis as unknown as {
  __rateLimitStore?: Map<string, RateLimitRecord>;
  __expLockoutStore?: Map<string, ExponentialLockoutRecord>;
  __rateLimitCleanupTimer?: NodeJS.Timeout;
};

const store = globalRef.__rateLimitStore ?? new Map<string, RateLimitRecord>();
const expStore = globalRef.__expLockoutStore ?? new Map<string, ExponentialLockoutRecord>();

if (process.env.NODE_ENV !== "production") {
  globalRef.__rateLimitStore = store;
  globalRef.__expLockoutStore = expStore;
}

// Automatically prune expired keys every 5 minutes
if (!globalRef.__rateLimitCleanupTimer) {
  globalRef.__rateLimitCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }

    for (const [key, record] of expStore.entries()) {
      // Clean up records where lock has expired and no attempts occurred in 24 hours
      if (record.lockedUntil <= now && now - record.lastAttemptAt > 24 * 3600 * 1000) {
        expStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (globalRef.__rateLimitCleanupTimer.unref) {
    globalRef.__rateLimitCleanupTimer.unref();
  }
}

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

/**
 * Format duration in seconds to a human-readable English string.
 * Examples: "45 minutes", "1 hour", "2 hours", "4 hours", "8 hours"
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

/**
 * Check if a key is currently under an active exponential lockout.
 */
export function checkExponentialLockout(key: string): {
  locked: boolean;
  resetInSeconds: number;
  formattedDuration: string;
  tier: number;
} {
  const now = Date.now();
  const record = expStore.get(key);

  if (!record || record.lockedUntil <= now) {
    return { locked: false, resetInSeconds: 0, formattedDuration: "", tier: record?.tier ?? 0 };
  }

  const resetInSeconds = Math.max(1, Math.ceil((record.lockedUntil - now) / 1000));
  return {
    locked: true,
    resetInSeconds,
    formattedDuration: formatSecondsToHumanReadable(resetInSeconds),
    tier: record.tier,
  };
}

/**
 * Record a failed attempt under exponential backoff.
 * When threshold is hit or exceeded:
 * - 1st lockout: 1 hour (baseLockSeconds)
 * - 2nd lockout / attempt: 2 hours (1h * 2)
 * - 3rd lockout / attempt: 4 hours (2h * 2)
 * - 4th lockout / attempt: 8 hours (4h * 2)
 * - Capped at maxLockSeconds (24 hours)
 */
export function recordExponentialFailure(
  key: string,
  options: ExponentialLockoutOptions
): {
  locked: boolean;
  resetInSeconds: number;
  formattedDuration: string;
  attempts: number;
  threshold: number;
} {
  const now = Date.now();
  const baseSeconds = options.baseLockSeconds ?? 3600; // 1 hour base
  const maxSeconds = options.maxLockSeconds ?? 24 * 3600; // 24 hours max
  const decayMs = (options.decaySeconds ?? 24 * 3600) * 1000;

  let record = expStore.get(key);

  if (!record || (record.lockedUntil <= now && now - record.lastAttemptAt > decayMs)) {
    record = {
      failedAttempts: 1,
      lockedUntil: 0,
      tier: 0,
      lastAttemptAt: now,
    };
  } else {
    record.failedAttempts += 1;
    record.lastAttemptAt = now;
  }

  if (record.failedAttempts >= options.threshold) {
    // Escalate tier
    record.tier = Math.max(1, record.tier + 1);

    // Multiplier: 2^(tier - 1) => tier 1 = 1x (1h), tier 2 = 2x (2h), tier 3 = 4x (4h), tier 4 = 8x (8h)...
    const multiplier = Math.pow(2, record.tier - 1);
    const lockDurationSeconds = Math.min(baseSeconds * multiplier, maxSeconds);

    record.lockedUntil = now + lockDurationSeconds * 1000;
    expStore.set(key, record);

    return {
      locked: true,
      resetInSeconds: lockDurationSeconds,
      formattedDuration: formatSecondsToHumanReadable(lockDurationSeconds),
      attempts: record.failedAttempts,
      threshold: options.threshold,
    };
  }

  expStore.set(key, record);
  return {
    locked: false,
    resetInSeconds: 0,
    formattedDuration: "",
    attempts: record.failedAttempts,
    threshold: options.threshold,
  };
}

/**
 * If an attacker continues spamming attempts while ALREADY locked out,
 * this penalizes them immediately by doubling their lock duration (1h -> 2h -> 4h -> 8h -> 24h).
 */
export function recordSpamWhileLocked(
  key: string,
  options: ExponentialLockoutOptions
): {
  resetInSeconds: number;
  formattedDuration: string;
  tier: number;
} {
  const now = Date.now();
  const baseSeconds = options.baseLockSeconds ?? 3600;
  const maxSeconds = options.maxLockSeconds ?? 24 * 3600;

  let record = expStore.get(key);
  if (!record) {
    record = {
      failedAttempts: options.threshold,
      lockedUntil: now + baseSeconds * 1000,
      tier: 1,
      lastAttemptAt: now,
    };
  } else {
    // Escalate tier on persistent violation
    record.tier = Math.min(record.tier + 1, 10);
    record.failedAttempts += 1;
    record.lastAttemptAt = now;

    const multiplier = Math.pow(2, record.tier - 1);
    const lockDurationSeconds = Math.min(baseSeconds * multiplier, maxSeconds);
    record.lockedUntil = now + lockDurationSeconds * 1000;
  }

  expStore.set(key, record);
  const remainingSec = Math.max(1, Math.ceil((record.lockedUntil - now) / 1000));

  return {
    resetInSeconds: remainingSec,
    formattedDuration: formatSecondsToHumanReadable(remainingSec),
    tier: record.tier,
  };
}

/**
 * Reset exponential lockout record (e.g. after successful login).
 */
export function resetExponentialLockout(key: string): void {
  expStore.delete(key);
}

/**
 * Standard sliding-window rate limit check without incrementing.
 */
export function isRateLimited(key: string, limit: number): { limited: boolean; remaining: number; resetInSeconds: number } {
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

/**
 * Standard sliding-window increment.
 */
export function incrementRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = store.get(key);

  if (!record || record.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      remaining: limit - 1,
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
 * Clear sliding-window rate limit key.
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
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
