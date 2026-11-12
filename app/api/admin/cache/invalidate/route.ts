import { auth } from "@/lib/auth";
import { countRedisCacheKeys, invalidateAllRedisCache } from "@/lib/redis/cache";
import { getRedisStatus } from "@/lib/redis/client";
import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

type AuthCheckResult =
  | { authorized: true }
  | { authorized: false; status: 401 | 403; error: string };

function matchesDeploySecret(req: NextRequest): boolean {
  const configuredSecret = process.env.CACHE_INVALIDATION_SECRET?.trim();
  if (!configuredSecret || configuredSecret.length < 16) {
    return false;
  }

  const headerSecret = req.headers.get("x-cache-secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const bearerSecret = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : undefined;

  const candidate = headerSecret || bearerSecret;
  if (!candidate) return false;

  const expectedBuf = Buffer.from(configuredSecret, "utf8");
  const actualBuf = Buffer.from(candidate, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}

async function authorizeCacheControl(req: NextRequest): Promise<AuthCheckResult> {
  if (matchesDeploySecret(req)) {
    return { authorized: true };
  }

  const session = await auth();
  if (!session?.user) {
    return { authorized: false, status: 401, error: "Unauthorized" };
  }

  const user = session.user as { userType?: string; level?: string };
  const isAllowedAdmin =
    user.userType === "ADMIN" &&
    (user.level === "DEVELOPER" || user.level === "SUPER_ADMIN");

  if (!isAllowedAdmin) {
    return {
      authorized: false,
      status: 403,
      error: "Forbidden: Developer or Super Admin permission required.",
    };
  }

  return { authorized: true };
}

export async function GET(req: NextRequest) {
  const check = await authorizeCacheControl(req);
  if (!check.authorized) {
    return NextResponse.json({ ok: false, error: check.error }, { status: check.status });
  }

  const [status, keyStats] = await Promise.all([
    getRedisStatus(),
    countRedisCacheKeys(),
  ]);

  return NextResponse.json(
    {
      ok: true,
      mode: status.mode,
      connected: status.connected,
      status: status.status,
      cacheKeyCount: keyStats.count,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const check = await authorizeCacheControl(req);
  if (!check.authorized) {
    return NextResponse.json({ ok: false, error: check.error }, { status: check.status });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      includeRateLimits?: boolean;
    };
    const includeRateLimits = Boolean(body?.includeRateLimits);

    const result = await invalidateAllRedisCache({ includeRateLimits });
    try {
      revalidatePath("/", "layout");
    } catch {
      // Safe no-op if layout revalidation isn't applicable in current request context
    }

    const sourceLabel = result.mode === "redis" ? "Redis" : "in-memory fallback";
    return NextResponse.json(
      {
        ...result,
        message: `Cleared ${result.clearedKeys} cached key${result.clearedKeys === 1 ? "" : "s"} from ${sourceLabel}.`,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[API /api/admin/cache/invalidate] Failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to invalidate Redis cache." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

