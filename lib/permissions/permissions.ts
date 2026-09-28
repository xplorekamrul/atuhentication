import { prisma } from "@/lib/prisma";
import developerPages from "./developer-pages.json";
import { matchesPattern, normalizePath } from "./route-pattern-matcher";

/**
 * Check if a path is developer-only
 */
export function isDeveloperOnlyPage(pathname: string): boolean {
   return developerPages.developerOnlyPages.some(page =>
      pathname === page || pathname.startsWith(page + "/")
   );
}

/**
 * Get all accessible routes for an admin based on their level and roles
 */
export async function getAdminAccessibleRoutes(adminId: bigint) {
   const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
         level: true,
         adminRoles: {
            select: { roleId: true },
         },
      },
   });

   if (!admin) return [];

   // DEVELOPER has full access
   if (admin.level === "DEVELOPER") {
      return null; // null means full access
   }

   // SUPER_ADMIN: get all visible routes in database
   if (admin.level === "SUPER_ADMIN") {
      const routes = await prisma.route.findMany({
         where: { visibleToSuperAdmin: true },
         select: { path: true },
      });
      return routes.map((r) => r.path);
   }

   // ADMIN users: get visible routes from their assigned roles
   if (admin.level === "ADMIN" && admin.adminRoles.length > 0) {
      const roleIds = admin.adminRoles.map((ar) => ar.roleId);
      const roleRouteGroups = await prisma.roleRouteGroup.findMany({
         where: { roleId: { in: roleIds } },
         select: {
            group: {
               select: {
                  routes: {
                     where: { visibleToAdmin: true },
                     select: { path: true },
                  },
               },
            },
         },
      });

      const paths = new Set<string>();
      roleRouteGroups.forEach((rrg) => {
         rrg.group.routes.forEach((route) => {
            paths.add(route.path);
         });
      });

      return Array.from(paths);
   }

   return [];
}

/**
 * Check if an admin can access a specific path
 */
export async function canAdminAccessPath(adminId: bigint, path: string): Promise<boolean> {
   const normalizedPath = normalizePath(path);

   // Allow /admin base path for all authenticated admins
   if (normalizedPath === "/admin") {
      return true;
   }

   // Unrestricted paths - accessible to all authenticated admins
   const unrestrictedPaths = ["/admin/profile", "/admin/help"];
   if (unrestrictedPaths.includes(normalizedPath)) {
      return true;
   }

   // Developer-only pages - only DEVELOPER level can access
   if (isDeveloperOnlyPage(normalizedPath)) {
      const admin = await prisma.admin.findUnique({
         where: { id: adminId },
         select: { level: true },
      });
      return admin?.level === "DEVELOPER";
   }

   const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
         level: true,
         adminRoles: {
            select: { roleId: true },
         },
      },
   });

   if (!admin) return false;

   // DEVELOPER has full access
   if (admin.level === "DEVELOPER") {
      return true;
   }

   // SUPER_ADMIN: can access any route in database that is visible to super admin
   if (admin.level === "SUPER_ADMIN") {
      const routes = await prisma.route.findMany({
         where: { visibleToSuperAdmin: true },
         select: { path: true },
      });

      const hasAccess = routes.some((route) => matchesPattern(route.path, normalizedPath));
      console.log(`[canAdminAccessPath] SUPER_ADMIN - Path: ${normalizedPath}, HasAccess: ${hasAccess}`);
      return hasAccess;
   }

   // ADMIN users: check if path matches any route in their assigned roles AND is visible to admin
   if (admin.level === "ADMIN") {
      // If no roles assigned, they can still access /admin base path (already handled above)
      if (admin.adminRoles.length === 0) {
         console.log(`[canAdminAccessPath] ADMIN without roles - Path: ${normalizedPath}, HasAccess: false`);
         return false;
      }

      const roleIds = admin.adminRoles.map((ar) => ar.roleId);
      const routes = await prisma.route.findMany({
         where: {
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

      const hasAccess = routes.some((route) => matchesPattern(route.path, normalizedPath));
      console.log(`[canAdminAccessPath] ADMIN - Path: ${normalizedPath}, Routes: ${routes.map(r => r.path).join(', ')}, HasAccess: ${hasAccess}`);
      return hasAccess;
   }

   return false;
}

/**
 * Check if an admin can edit a specific route
 */
export async function canAdminEditRoute(adminId: bigint, routePath: string): Promise<boolean> {
   const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
         level: true,
         adminRoles: {
            select: { roleId: true },
         },
      },
   });

   if (!admin) return false;

   // DEVELOPER has full edit access
   if (admin.level === "DEVELOPER") {
      return true;
   }

   // SUPER_ADMIN: can edit any route in database
   if (admin.level === "SUPER_ADMIN") {
      const route = await prisma.route.findUnique({
         where: { path: routePath },
         select: { id: true },
      });

      return !!route;
   }

   // ADMIN: check if route is in their assigned groups
   if (admin.level === "ADMIN" && admin.adminRoles.length > 0) {
      const roleIds = admin.adminRoles.map((ar) => ar.roleId);
      const route = await prisma.route.findUnique({
         where: { path: routePath },
         select: {
            groupId: true,
         },
      });

      if (!route) {
         return false;
      }

      const hasGroupAccess = await prisma.roleRouteGroup.findFirst({
         where: {
            roleId: { in: roleIds },
            groupId: route.groupId,
         },
      });

      return !!hasGroupAccess;
   }

   return false;
}
