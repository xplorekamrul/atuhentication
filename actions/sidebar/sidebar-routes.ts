import { auth } from '@/lib/auth';
import { getCachedAdminAccessiblePaths } from '@/lib/permissions/permissions';
import { prisma } from '@/lib/prisma';
import { cacheLife, cacheTag } from 'next/cache';

export type SidebarRoute = {
   path: string;
   label: string;
};

/**
 * Cached route metadata from database (no auth calls inside "use cache")
 */
async function getCachedAllRoutesMeta() {
   'use cache';
   cacheLife('hours');
   cacheTag('sidebar-routes', 'rbac-data', 'rbac-routes');

   const routes = await prisma.route.findMany({
      select: {
         path: true,
         visibleToAdmin: true,
         visibleToSuperAdmin: true,
         groupId: true,
         group: {
            select: {
               name: true,
            },
         },
      },
   });

   return routes.map((r) => ({
      path: r.path,
      visibleToAdmin: r.visibleToAdmin,
      visibleToSuperAdmin: r.visibleToSuperAdmin,
      groupId: r.groupId.toString(),
      groupName: r.group.name,
   }));
}

/**
 * Get all routes with their visibility permissions (Layer 2 cached)
 */
export async function getRoutesWithPermissions() {
   const session = await auth();
   const adminId = session?.user?.id ?? null;
   const adminLevel = (session?.user as any)?.level as string | undefined;

   const [allRoutes, accessiblePaths] = await Promise.all([
      getCachedAllRoutesMeta(),
      adminId && adminLevel ? getCachedAdminAccessiblePaths(adminId, adminLevel) : Promise.resolve([]),
   ]);

   const accessibleSet = new Set(accessiblePaths);
   const hasWildcard = accessibleSet.has('*');

   const routePermissions = new Map<
      string,
      {
         visibleToAdmin: boolean;
         visibleToSuperAdmin: boolean;
         groupName: string;
         groupId: bigint;
         isAccessibleToAdmin: boolean;
      }
   >();

   allRoutes.forEach((route) => {
      routePermissions.set(route.path, {
         visibleToAdmin: route.visibleToAdmin,
         visibleToSuperAdmin: route.visibleToSuperAdmin,
         groupName: route.groupName,
         groupId: BigInt(route.groupId),
         isAccessibleToAdmin: hasWildcard || accessibleSet.has(route.path),
      });
   });

   return routePermissions;
}

/**
 * Filter hardcoded routes based on admin level and database permissions
 */
export async function filterRoutesByPermissions(
   routes: SidebarRoute[],
   adminLevel: 'ADMIN' | 'SUPER_ADMIN' | 'DEVELOPER',
   routePermissions: Map<
      string,
      {
         visibleToAdmin: boolean;
         visibleToSuperAdmin: boolean;
         groupName: string;
         groupId: bigint;
         isAccessibleToAdmin: boolean;
      }
   >
): Promise<SidebarRoute[]> {
   if (adminLevel === 'DEVELOPER') {
      return routes;
   }

   return routes.filter((route) => {
      const permissions = routePermissions.get(route.path);
      if (!permissions) return false;

      if (adminLevel === 'SUPER_ADMIN') {
         return permissions.visibleToSuperAdmin;
      }

      if (adminLevel === 'ADMIN') {
         return permissions.visibleToAdmin && permissions.isAccessibleToAdmin;
      }

      return false;
   });
}
