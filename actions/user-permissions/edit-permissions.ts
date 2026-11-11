"use server";

import { auth } from "@/lib/auth";
import { toBigIntOrNull } from "@/lib/bigint-utils";
import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

async function getCachedAdminRoleInfo(adminId: string) {
   "use cache";
   cacheLife("hours");
   cacheTag("admin-permissions", `admin-permissions-${adminId}`);

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
}

/**
 * Get edit permissions for a specific route path
 * Cached to avoid multiple database calls
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
 * Cached route permission checking (takes serializable string[] roleIds)
 */
async function getCachedEditPermission(
   routePath: string,
   adminLevel: string,
   roleIdsStr: string[]
) {
   "use cache";
   cacheLife("hours");
   cacheTag("admin-permissions", "route-edit-permissions", `route-${routePath}`);

   const route = await prisma.route.findUnique({
      where: { path: routePath },
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
}

/**
 * Get all edit permissions for an admin across all routes
 * Used for bulk permission checks
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
 * Cached admin edit permissions (returns plain serializable Record)
 */
async function getCachedUserEditPermissions(
   adminLevel: string,
   roleIdsStr: string[]
): Promise<Record<string, boolean>> {
   "use cache";
   cacheLife("hours");
   cacheTag("admin-permissions", "user-edit-permissions", `level-${adminLevel}`);

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
}
