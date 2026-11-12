import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CACHE_TTL_SECONDS,
  getOrSetCache,
  invalidateCacheTags,
} from "@/lib/redis/cache";
import developerPages from "./developer-pages.json";
import { matchesPattern, normalizePath } from "./route-pattern-matcher";

/**
 * Check if a path is developer-only
 */
export function isDeveloperOnlyPage(pathname: string): boolean {
  return developerPages.developerOnlyPages.some(
    (page) => pathname === page || pathname.startsWith(page + "/")
  );
}

/**
 * Resolve admin level using Redis cache (with automatic in-memory fallback)
 */
async function resolveAdminLevel(adminId: string): Promise<string | null> {
  return getOrSetCache<string | null>({
    key: `rbac:admin:level:${adminId}`,
    tags: ["admin-permissions", `admin-permissions-${adminId}`],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: async () => {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: { level: true },
      });
      return admin?.level ?? null;
    },
  });
}

/**
 * Fetch accessible route paths for an admin via Redis cache (0 DB hits on cache hit).
 * Shared seamlessly across proxy.ts, Server Components, and Server Actions.
 */
export async function fetchAdminAccessiblePaths(
  adminId: string,
  level: string
): Promise<string[]> {
  if (level === "DEVELOPER") {
    return ["*"];
  }

  return getOrSetCache<string[]>({
    key: `rbac:admin:paths:${adminId}:${level}`,
    tags: ["admin-permissions", `admin-permissions-${adminId}`],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: async () => {
      if (level === "SUPER_ADMIN") {
        const routes = await prisma.route.findMany({
          where: { visibleToSuperAdmin: true },
          select: { path: true },
        });
        return routes.map((r) => r.path);
      }

      if (level === "ADMIN") {
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
        return routes.map((r) => r.path);
      }

      return [];
    },
  });
}

/**
 * Redis-cached accessible route paths for Server Components and Server Actions
 */
export async function getCachedAdminAccessiblePaths(
  adminId: string,
  level: string
): Promise<string[]> {
  return fetchAdminAccessiblePaths(adminId, level);
}

/**
 * Get all accessible routes for an admin based on their level and roles.
 * Returns null for DEVELOPER (unrestricted full access).
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
 * Check if an admin can access a specific path (uses Redis cache for proxy speed)
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
 * Redis-cached check for whether an admin can edit a specific route
 */
async function getCachedAdminCanEditRoute(
  adminId: string,
  level: string,
  routePath: string
): Promise<boolean> {
  const normalizedRoute = normalizePath(routePath);
  if (level === "DEVELOPER") return true;

  return getOrSetCache<boolean>({
    key: `rbac:admin:edit-route:${adminId}:${level}:${normalizedRoute}`,
    tags: [
      "admin-permissions",
      `admin-permissions-${adminId}`,
      "route-edit-permissions",
      `route-${normalizedRoute}`,
    ],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: async () => {
      if (level === "SUPER_ADMIN") {
        const route = await prisma.route.findUnique({
          where: { path: normalizedRoute },
          select: { id: true },
        });
        return !!route;
      }

      if (level === "ADMIN") {
        const route = await prisma.route.findFirst({
          where: {
            path: normalizedRoute,
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
    },
  });
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
 * Instant Distributed Redis Cache Invalidator:
 * Clears Redis permission/sidebar/RBAC cache keys across all instances immediately.
 */
export async function invalidateAdminPermissionsCache(adminId?: string): Promise<void> {
  if (adminId) {
    await invalidateCacheTags(`admin-permissions-${adminId}`, "rbac-roles");
    return;
  }

  await invalidateCacheTags(
    "admin-permissions",
    "sidebar-routes",
    "route-edit-permissions",
    "user-edit-permissions",
    "rbac-data",
    "rbac-roles",
    "rbac-route-groups",
    "rbac-routes"
  );
}
