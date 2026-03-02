"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Get edit permissions for a specific route path
 * Cached to avoid multiple database calls
 * 
 * Returns:
 * - null: User has full edit access (DEVELOPER or SUPER_ADMIN with editableBySuperAdmin)
 * - true: User has edit access (ADMIN with editableByAdmin or SUPER_ADMIN with editableBySuperAdmin)
 * - false: User only has view access
 */
export async function getEditPermissionForRoute(routePath: string) {
   try {
      const session = await auth();

      if (!session?.user?.id) {
         return false;
      }

      const adminId = BigInt(session.user.id);
      const admin = await prisma.admin.findUnique({
         where: { id: adminId },
         select: {
            level: true,
            adminRoles: {
               select: { roleId: true },
            },
         },
      });

      if (!admin) {
         return false;
      }

      // DEVELOPER has full edit access
      if (admin.level === "DEVELOPER") {
         return null; // null means full access
      }

      // Get cached route permissions
      const roleIds = admin.adminRoles.map((ar) => ar.roleId);
      return getCachedEditPermission(routePath, admin.level, roleIds);
   } catch (error) {
      console.error("[getEditPermissionForRoute] Error:", error);
      return false;
   }
}
 
/**
 * Cached route permission checking
 */
async function getCachedEditPermission(
   routePath: string,
   adminLevel: string,
   roleIds: bigint[]
) {
   "use cache";
   cacheLife("hours");
   cacheTag("route-edit-permissions", `route-${routePath}`);

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

   // SUPER_ADMIN: check editableBySuperAdmin flag
   if (adminLevel === "SUPER_ADMIN") {
      return route.editableBySuperAdmin ? null : false;
   }

   // ADMIN: check editableByAdmin flag AND role access
   if (adminLevel === "ADMIN" && roleIds.length > 0) {
      // First check if route is visible to admin
      if (!route.visibleToAdmin) {
         return false;
      }

      // Check if admin has access to this route's group through any role
      const hasGroupAccess = await prisma.roleRouteGroup.findFirst({
         where: {
            roleId: { in: roleIds },
            groupId: route.groupId,
         },
      });

      if (!hasGroupAccess) {
         return false;
      }

      // Check if route is editable by admin
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

      const adminId = BigInt(session.user.id);
      const admin = await prisma.admin.findUnique({
         where: { id: adminId },
         select: {
            level: true,
            adminRoles: {
               select: { roleId: true },
            },
         },
      });

      if (!admin) {
         return new Map<string, boolean>();
      }

      // DEVELOPER has full access to all routes
      if (admin.level === "DEVELOPER") {
         return null; // null means full access
      }

      const roleIds = admin.adminRoles.map((ar) => ar.roleId);
      return getCachedUserEditPermissions(admin.level, roleIds);
   } catch (error) {
      console.error("[getUserEditPermissions] Error:", error);
      return new Map<string, boolean>();
   }
}

/**
 * Cached admin edit permissions
 */
async function getCachedUserEditPermissions(adminLevel: string, roleIds: bigint[]) {
   "use cache";
   cacheLife("hours");
   cacheTag("user-edit-permissions", `level-${adminLevel}`);

   const permissions = new Map<string, boolean>();

   if (adminLevel === "SUPER_ADMIN") {
      // Get all routes editable by super admin
      const routes = await prisma.route.findMany({
         where: { editableBySuperAdmin: true },
         select: { path: true },
      });

      routes.forEach((route) => {
         permissions.set(route.path, true);
      });
   } else if (adminLevel === "ADMIN" && roleIds.length > 0) {
      // Get all routes editable by admin in admin's roles
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
         permissions.set(route.path, true);
      });
   }

   return permissions;
}
