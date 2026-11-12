"use server";

import { auth } from "@/lib/auth";
import { toBigIntOrNull } from "@/lib/bigint-utils";
import { normalizePath } from "@/lib/permissions/route-pattern-matcher";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CACHE_TTL_SECONDS, getOrSetCache } from "@/lib/redis/cache";

async function getCachedAdminRoleInfo(adminId: string) {
   return getOrSetCache({
      key: `rbac:admin:role-info:${adminId}`,
      tags: ["admin-permissions", `admin-permissions-${adminId}`],
      ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
      fetcher: async () => {
         const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: {
               level: true,
               adminRoles: {
                  select: { roleId: true },
               },
            },
         });

         if (!admin) return null;

         return {
            level: admin.level,
            roleIds: admin.adminRoles.map((ar) => ar.roleId.toString()),
         };
      },
   });
}

/**
 * Get edit permissions for a specific route path.
 * Redis-cached to avoid repeated database calls.
 *
 * Returns:
 * - null: User has full edit access (DEVELOPER or SUPER_ADMIN with editableBySuperAdmin)
 * - true: User has edit access (ADMIN with editableByAdmin)
 * - false: User only has view access
 */
export async function getEditPermissionForRoute(routePath: string) {
   try {
      const session = await auth();

      if (!session?.user?.id) {
         return false;
      }

      const adminInfo = await getCachedAdminRoleInfo(session.user.id);
      if (!adminInfo) {
         return false;
      }

      if (adminInfo.level === "DEVELOPER") {
         return null; // null means full access
      }

      return getCachedEditPermission(routePath, adminInfo.level, adminInfo.roleIds);
   } catch (error) {
      console.error("[getEditPermissionForRoute] Error:", error);
      return false;
   }
}

/**
 * Redis-cached route permission check (returns null | boolean)
 */
async function getCachedEditPermission(
   routePath: string,
   adminLevel: string,
   roleIdsStr: string[]
): Promise<boolean | null> {
   const normalizedRoute = normalizePath(routePath);
   const sortedRoleKey = [...roleIdsStr].sort().join(",") || "none";

   return getOrSetCache<boolean | null>({
      key: `rbac:admin:edit-perm:${normalizedRoute}:${adminLevel}:${sortedRoleKey}`,
      tags: ["admin-permissions", "route-edit-permissions", `route-${normalizedRoute}`],
      ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
      fetcher: async () => {
         const route = await prisma.route.findUnique({
            where: { path: normalizedRoute },
            select: {
               editableByAdmin: true,
               editableBySuperAdmin: true,
               visibleToAdmin: true,
               visibleToSuperAdmin: true,
               groupId: true,
            },
         });

         if (!route) {
            return false;
         }

         if (adminLevel === "SUPER_ADMIN") {
            return route.editableBySuperAdmin ? null : false;
         }

         if (adminLevel === "ADMIN" && roleIdsStr.length > 0) {
            if (!route.visibleToAdmin) {
               return false;
            }

            const roleIds = roleIdsStr
               .map((id) => toBigIntOrNull(id))
               .filter((id): id is bigint => id !== null);

            if (roleIds.length === 0) return false;

            const hasGroupAccess = await prisma.roleRouteGroup.findFirst({
               where: {
                  roleId: { in: roleIds },
                  groupId: route.groupId,
               },
            });

            if (!hasGroupAccess) {
               return false;
            }

            return route.editableByAdmin ? true : false;
         }

         return false;
      },
   });
}

/**
 * Get all edit permissions for an admin across all routes.
 * Used for bulk permission checks.
 */
export async function getUserEditPermissions() {
   try {
      const session = await auth();

      if (!session?.user?.id) {
         return new Map<string, boolean>();
      }

      const adminInfo = await getCachedAdminRoleInfo(session.user.id);
      if (!adminInfo) {
         return new Map<string, boolean>();
      }

      if (adminInfo.level === "DEVELOPER") {
         return null; // null means full access
      }

      const record = await getCachedUserEditPermissions(adminInfo.level, adminInfo.roleIds);
      return new Map<string, boolean>(Object.entries(record));
   } catch (error) {
      console.error("[getUserEditPermissions] Error:", error);
      return new Map<string, boolean>();
   }
}

/**
 * Redis-cached admin edit permissions (returns plain serializable Record)
 */
async function getCachedUserEditPermissions(
   adminLevel: string,
   roleIdsStr: string[]
): Promise<Record<string, boolean>> {
   const sortedRoleKey = [...roleIdsStr].sort().join(",") || "none";

   return getOrSetCache<Record<string, boolean>>({
      key: `rbac:admin:edit-all:${adminLevel}:${sortedRoleKey}`,
      tags: ["admin-permissions", "user-edit-permissions", `level-${adminLevel}`],
      ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
      fetcher: async () => {
         const permissions: Record<string, boolean> = {};

         if (adminLevel === "SUPER_ADMIN") {
            const routes = await prisma.route.findMany({
               where: { editableBySuperAdmin: true },
               select: { path: true },
            });

            routes.forEach((route) => {
               permissions[route.path] = true;
            });
         } else if (adminLevel === "ADMIN" && roleIdsStr.length > 0) {
            const roleIds = roleIdsStr
               .map((id) => toBigIntOrNull(id))
               .filter((id): id is bigint => id !== null);

            if (roleIds.length === 0) return permissions;

            const routes = await prisma.route.findMany({
               where: {
                  editableByAdmin: true,
                  visibleToAdmin: true,
                  group: {
                     roleRouteGroups: {
                        some: {
                           roleId: { in: roleIds },
                        },
                     },
                  },
               },
               select: { path: true },
            });

            routes.forEach((route) => {
               permissions[route.path] = true;
            });
         }

         return permissions;
      },
   });
}
