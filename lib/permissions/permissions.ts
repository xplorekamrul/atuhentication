import { prisma } from "@/lib/prisma";
import { matchesPattern, normalizePath } from "./route-pattern-matcher";

/**
 * Get all accessible routes for a user based on their role and userlevel
 */
export async function getUserAccessibleRoutes(userId: bigint) {
   const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
         userlevel: true,
         userRoles: {
            select: { roleId: true },
         },
      },
   });

   if (!user) return [];

   // DEVELOPER has full access
   if (user.userlevel === "DEVELOPER") {
      return null; // null means full access
   }

   // SUPER_ADMIN: get all routes in database (no filtering)
   if (user.userlevel === "SUPER_ADMIN") {
      const routes = await prisma.route.findMany({
         select: { path: true },
      });
      return routes.map((r) => r.path);
   }

   // ADMIN users: get routes from their assigned roles
   if (user.userlevel === "ADMIN" && user.userRoles.length > 0) {
      const roleIds = user.userRoles.map((ur) => ur.roleId);
      const roleRouteGroups = await prisma.roleRouteGroup.findMany({
         where: { roleId: { in: roleIds } },
         select: {
            group: {
               select: {
                  routes: {
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
 * Check if a user can access a specific path
 * Supports both exact paths and dynamic route patterns
 */
export async function canUserAccessPath(userId: bigint, path: string): Promise<boolean> {
   const normalizedPath = normalizePath(path);

   // Unrestricted paths - accessible to all authenticated users
   const unrestrictedPaths = ["/help", "/profile"];
   if (unrestrictedPaths.includes(normalizedPath)) {
      return true;
   }

   const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
         userlevel: true,
         userRoles: {
            select: { roleId: true },
         },
      },
   });

   if (!user) return false;

   // DEVELOPER has full access
   if (user.userlevel === "DEVELOPER") {
      return true;
   }

   // SUPER_ADMIN: can access any route in database
   // If route not in database, deny access (redirect to home)
   if (user.userlevel === "SUPER_ADMIN") {
      const routes = await prisma.route.findMany({
         select: { path: true },
      });

      const hasAccess = routes.some((route) => matchesPattern(route.path, normalizedPath));
      console.log(`[canUserAccessPath] SUPER_ADMIN - Path: ${normalizedPath}, HasAccess: ${hasAccess}`);
      return hasAccess;
   }

   // ADMIN users: check if path matches any route in their assigned roles
   if (user.userlevel === "ADMIN") {
      // If user has no roles, deny access
      if (user.userRoles.length === 0) {
         console.log(`[canUserAccessPath] ADMIN without roles - Path: ${normalizedPath}, HasAccess: false`);
         return false;
      }

      const roleIds = user.userRoles.map((ur) => ur.roleId);
      const routes = await prisma.route.findMany({
         where: {
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
      console.log(`[canUserAccessPath] ADMIN - Path: ${normalizedPath}, Routes: ${routes.map(r => r.path).join(', ')}, HasAccess: ${hasAccess}`);
      return hasAccess;
   }

   return false;
}

/**
 * Get route groups for a user's roles
 */
export async function getUserRouteGroups(userId: bigint) {
   const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
         userlevel: true,
         userRoles: {
            select: { roleId: true },
         },
      },
   });

   if (!user) return [];

   // DEVELOPER has access to all route groups
   if (user.userlevel === "DEVELOPER") {
      return null; // null means all route groups
   }

   // SUPER_ADMIN: get all route groups
   if (user.userlevel === "SUPER_ADMIN") {
      const groups = await prisma.routeGroup.findMany({
         select: {
            id: true,
            name: true,
            routes: {
               select: {
                  id: true,
                  path: true,
               },
            },
         },
      });
      return groups;
   }

   // ADMIN users: get their assigned route groups
   if (user.userlevel === "ADMIN" && user.userRoles.length > 0) {
      const roleIds = user.userRoles.map((ur) => ur.roleId);
      const roleRouteGroups = await prisma.roleRouteGroup.findMany({
         where: { roleId: { in: roleIds } },
         select: {
            group: {
               select: {
                  id: true,
                  name: true,
                  routes: {
                     select: {
                        id: true,
                        path: true,
                     },
                  },
               },
            },
         },
      });

      return roleRouteGroups.map((rrg) => rrg.group);
   }

   return [];
}

/**
 * Check if a user can edit a specific route
 * Returns true if user has edit permission, false if only view permission
 */
export async function canUserEditRoute(userId: bigint, routePath: string): Promise<boolean> {
   const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
         userlevel: true,
         userRoles: {
            select: { roleId: true },
         },
      },
   });

   if (!user) return false;

   // DEVELOPER has full edit access
   if (user.userlevel === "DEVELOPER") {
      return true;
   }

   // SUPER_ADMIN: can edit any route in database
   if (user.userlevel === "SUPER_ADMIN") {
      const route = await prisma.route.findUnique({
         where: { path: routePath },
         select: { id: true },
      });

      return !!route;
   }

   // ADMIN: check if route is in their assigned groups
   if (user.userlevel === "ADMIN" && user.userRoles.length > 0) {
      const roleIds = user.userRoles.map((ur) => ur.roleId);
      const route = await prisma.route.findUnique({
         where: { path: routePath },
         select: {
            groupId: true,
         },
      });

      if (!route) {
         return false;
      }

      // Check if admin has access to this route's group through any of their roles
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
