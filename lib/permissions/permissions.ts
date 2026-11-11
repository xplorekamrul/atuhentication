import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import developerPages from "./developer-pages.json";
import { matchesPattern, normalizePath } from "./route-pattern-matcher";

// Global in-memory Layer 1 cache shared between proxy and server runtime
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  paths: string[];
  timestamp: number;
}

interface AdminLevelCacheEntry {
  level: string;
  timestamp: number;
}

const memoryPermissionsCache: Map<string, CacheEntry> =
  (globalThis as any).__memoryPermissionsCache || new Map();
(globalThis as any).__memoryPermissionsCache = memoryPermissionsCache;

const memoryAdminLevelCache: Map<string, AdminLevelCacheEntry> =
  (globalThis as any).__memoryAdminLevelCache || new Map();
(globalThis as any).__memoryAdminLevelCache = memoryAdminLevelCache;

/**
 * Check if a path is developer-only
 */
export function isDeveloperOnlyPage(pathname: string): boolean {
  return developerPages.developerOnlyPages.some(
    (page) => pathname === page || pathname.startsWith(page + "/")
  );
}

/**
 * Resolve admin level with Layer 1 in-memory caching
 */
async function resolveAdminLevel(adminId: string): Promise<string | null> {
  const now = Date.now();
  const cached = memoryAdminLevelCache.get(adminId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.level;
  }

  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { level: true },
  });

  if (!admin) return null;

  memoryAdminLevelCache.set(adminId, { level: admin.level, timestamp: now });
  return admin.level;
}

/**
 * Layer 1: Fetch accessible paths using globalThis in-memory cache (0 DB hits on cache hit).
 * Used directly by proxy.ts (which runs outside React "use cache") and wrapped by Layer 2.
 */
export async function fetchAdminAccessiblePaths(
  adminId: string,
  level: string
): Promise<string[]> {
  if (level === "DEVELOPER") {
    return ["*"];
  }

  const cacheKey = `${adminId}_${level}`;
  const now = Date.now();
  const cached = memoryPermissionsCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.paths;
  }

  let paths: string[] = [];

  if (level === "SUPER_ADMIN") {
    const routes = await prisma.route.findMany({
      where: { visibleToSuperAdmin: true },
      select: { path: true },
    });
    paths = routes.map((r) => r.path);
  } else if (level === "ADMIN") {
    // Single relational query: Admin -> AdminRole -> Role -> RoleRouteGroup -> RouteGroup -> Route
    const routes = await prisma.route.findMany({
      where: {
        visibleToAdmin: true,
        group: {
          roleRouteGroups: {
            some: {
              role: {
                adminRoles: {
                  some: { adminId },
                },
              },
            },
          },
        },
      },
      select: { path: true },
    });
    paths = routes.map((r) => r.path);
  }

  memoryPermissionsCache.set(cacheKey, { paths, timestamp: now });
  return paths;
}

/**
 * Layer 2: Next.js 16 "use cache" function for Server Components and Server Actions
 */
export async function getCachedAdminAccessiblePaths(
  adminId: string,
  level: string
): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("admin-permissions");
  cacheTag(`admin-permissions-${adminId}`);

  return fetchAdminAccessiblePaths(adminId, level);
}

/**
 * Get all accessible routes for an admin based on their level and roles
 * Returns null for DEVELOPER (unrestricted full access)
 */
export async function getAdminAccessibleRoutes(adminId: string, level?: string) {
  const resolvedLevel = level ?? (await resolveAdminLevel(adminId));
  if (!resolvedLevel) return [];

  if (resolvedLevel === "DEVELOPER") {
    return null; // null means full access
  }

  return getCachedAdminAccessiblePaths(adminId, resolvedLevel);
}

/**
 * Check if an admin can access a specific path (uses Layer 1 in-memory cache for proxy speed)
 */
export async function canAdminAccessPath(
  adminId: string,
  path: string,
  level?: string
): Promise<boolean> {
  const normalizedPath = normalizePath(path);

  // Allow /admin base path and unrestricted paths for all authenticated admins
  if (
    normalizedPath === "/admin" ||
    normalizedPath === "/admin/profile" ||
    normalizedPath === "/admin/help"
  ) {
    return true;
  }

  const resolvedLevel = level ?? (await resolveAdminLevel(adminId));
  if (!resolvedLevel) return false;

  // DEVELOPER has unrestricted full access
  if (resolvedLevel === "DEVELOPER") {
    return true;
  }

  // Developer-only pages - never accessible to SUPER_ADMIN or ADMIN
  if (isDeveloperOnlyPage(normalizedPath)) {
    return false;
  }

  const routes = await fetchAdminAccessiblePaths(adminId, resolvedLevel);
  if (routes.includes("*")) return true;

  // Fast-path: exact static route match
  if (routes.includes(normalizedPath)) return true;

  // Fallback: check dynamic routes ([id], [slug], etc.)
  return routes.some((route) => route.includes("[") && matchesPattern(route, normalizedPath));
}

/**
 * Cached check for whether an admin can edit a specific route
 */
async function getCachedAdminCanEditRoute(
  adminId: string,
  level: string,
  routePath: string
): Promise<boolean> {
  "use cache";
  cacheLife("hours");
  cacheTag("admin-permissions", `admin-permissions-${adminId}`, "route-edit-permissions", `route-${routePath}`);

  if (level === "DEVELOPER") return true;

  if (level === "SUPER_ADMIN") {
    const route = await prisma.route.findUnique({
      where: { path: routePath },
      select: { id: true },
    });
    return !!route;
  }

  if (level === "ADMIN") {
    const route = await prisma.route.findFirst({
      where: {
        path: routePath,
        group: {
          roleRouteGroups: {
            some: {
              role: {
                adminRoles: {
                  some: { adminId },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    return !!route;
  }

  return false;
}

/**
 * Check if an admin can edit a specific route
 */
export async function canAdminEditRoute(
  adminId: string,
  routePath: string,
  level?: string
): Promise<boolean> {
  const resolvedLevel = level ?? (await resolveAdminLevel(adminId));
  if (!resolvedLevel) return false;
  if (resolvedLevel === "DEVELOPER") return true;

  return getCachedAdminCanEditRoute(adminId, resolvedLevel, normalizePath(routePath));
}

/**
 * Instant Dual-Layer Cache Invalidator:
 * Clears BOTH Layer 1 (globalThis in-memory proxy cache) and Layer 2 (Next.js 16 cache tags).
 */
export async function invalidateAdminPermissionsCache(adminId?: string): Promise<void> {
  // 1. Clear Layer 1 in-memory cache (used by proxy.ts on next request)
  if (adminId) {
    for (const key of memoryPermissionsCache.keys()) {
      if (key.startsWith(`${adminId}_`)) {
        memoryPermissionsCache.delete(key);
      }
    }
    memoryAdminLevelCache.delete(adminId);
  } else {
    memoryPermissionsCache.clear();
    memoryAdminLevelCache.clear();
  }

  // 2. Clear Layer 2 Next.js 16 "use cache" tags
  try {
    const { revalidateTag } = await import("next/cache");
    if (adminId) {
      revalidateTag(`admin-permissions-${adminId}`, "max");
    } else {
      revalidateTag("admin-permissions", "max");
    }
    revalidateTag("sidebar-routes", "max");
    revalidateTag("route-edit-permissions", "max");
    revalidateTag("user-edit-permissions", "max");
    revalidateTag("rbac-data", "max");
    revalidateTag("rbac-roles", "max");
    revalidateTag("rbac-route-groups", "max");
    revalidateTag("rbac-routes", "max");
  } catch {
    // No-op if invoked outside Next.js server request context (e.g. standalone test script)
  }
}
