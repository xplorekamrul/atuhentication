import Redis, { type RedisOptions } from "ioredis";

const KEY_PREFIX = (process.env.REDIS_PREFIX || "authapp:").trim();
const RETRY_COOLDOWN_MS = 10_000; // Wait 10s between reconnect attempts when Docker Redis is down
const LOG_THROTTLE_MS = 30_000;   // Avoid spamming logs while running in fallback mode

type ReadyListener = () => void;

const globalForRedis = globalThis as unknown as {
  __redisClient?: Redis | null;
  __redisConnectPromise?: Promise<Redis | null> | null;
  __redisLastFailedAt?: number;
  __redisLastWarnAt?: number;
  __redisReadyListeners?: Set<ReadyListener>;
};

const readyListeners =
  globalForRedis.__redisReadyListeners ?? new Set<ReadyListener>();
globalForRedis.__redisReadyListeners = readyListeners;

export function getRedisKeyPrefix(): string {
  return KEY_PREFIX;
}

export function prefixRedisKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`;
}

export function onRedisReady(listener: ReadyListener): () => void {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
}

function logFallbackWarning(reason: string): void {
  const now = Date.now();
  if (
    !globalForRedis.__redisLastWarnAt ||
    now - globalForRedis.__redisLastWarnAt > LOG_THROTTLE_MS
  ) {
    globalForRedis.__redisLastWarnAt = now;
    console.warn(`[Redis] ${reason} — using in-memory fallback.`);
  }
}

function buildRedisOptions(): RedisOptions {
  return {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    connectTimeout: 2000,
    retryStrategy: () => null, // Controlled via COOLDOWN in getReadyRedisClient()
  };
}

function createRedisInstance(): Redis {
  const redisUrl = process.env.REDIS_URL?.trim();
  const options = buildRedisOptions();

  const client = redisUrl
    ? new Redis(redisUrl, options)
    : new Redis({
        ...options,
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
      });

  client.on("ready", () => {
    globalForRedis.__redisLastFailedAt = 0;
    for (const listener of readyListeners) {
      try {
        listener();
      } catch (err) {
        console.error("[Redis] onRedisReady listener error:", err);
      }
    }
  });

  client.on("error", (err) => {
    // Attach listener so Node never crashes on unhandled socket errors
    logFallbackWarning(err?.message || "Connection error");
  });

  return client;
}

export function getRawRedisClient(): Redis {
  if (!globalForRedis.__redisClient) {
    globalForRedis.__redisClient = createRedisInstance();
  }
  return globalForRedis.__redisClient;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function markRedisOffline(reason?: string): void {
  globalForRedis.__redisLastFailedAt = Date.now();
  if (reason) {
    logFallbackWarning(reason);
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.REDIS_URL?.trim() || process.env.REDIS_HOST?.trim()
  );
}

/**
 * Returns a connected, ready Redis client, or null if Redis is currently unavailable.
 * Never hangs waiting on an offline queue or crashed container.
 */
export async function getReadyRedisClient(): Promise<Redis | null> {
  if (process.env.REDIS_DISABLED === "true") {
    return null;
  }

  const client = getRawRedisClient();

  if (client.status === "ready") {
    return client;
  }

  const now = Date.now();
  const lastFailedAt = globalForRedis.__redisLastFailedAt ?? 0;
  if (lastFailedAt > 0 && now - lastFailedAt < RETRY_COOLDOWN_MS) {
    return null;
  }

  if (globalForRedis.__redisConnectPromise) {
    return globalForRedis.__redisConnectPromise;
  }

  globalForRedis.__redisConnectPromise = (async () => {
    try {
      if (client.status === "end") {
        // Recreate cleanly if socket permanently ended
        globalForRedis.__redisClient = createRedisInstance();
        const fresh = globalForRedis.__redisClient;
        await fresh.connect();
        return fresh.status === "ready" ? fresh : null;
      }

      if (client.status === "wait") {
        await client.connect();
      } else if (client.status === "connecting" || client.status === "connect") {
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onError = (err: Error) => {
            cleanup();
            reject(err);
          };
          const timer = setTimeout(() => {
            cleanup();
            reject(new Error("Redis connect timeout"));
          }, 2000);
          const cleanup = () => {
            clearTimeout(timer);
            client.off("ready", onReady);
            client.off("error", onError);
          };
          client.once("ready", onReady);
          client.once("error", onError);
        });
      }

      const active = globalForRedis.__redisClient;
      return active && active.status === "ready" ? active : null;
    } catch (err: unknown) {
      markRedisOffline(getErrorMessage(err, "Unable to connect to Redis"));
      return null;
    } finally {
      globalForRedis.__redisConnectPromise = null;
    }
  })();

  return globalForRedis.__redisConnectPromise;
}

export async function getRedisStatus(): Promise<{
  connected: boolean;
  status: string;
  mode: "redis" | "memory-fallback";
  urlConfigured: boolean;
}> {
  const client = await getReadyRedisClient();
  return {
    connected: Boolean(client),
    status: client ? client.status : getRawRedisClient().status,
    mode: client ? "redis" : "memory-fallback",
    urlConfigured: isRedisConfigured(),
  };
}
