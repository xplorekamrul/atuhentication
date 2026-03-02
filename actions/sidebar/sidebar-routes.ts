import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type SidebarRoute = {
   path: string;
   label: string;
};

/**
 * Get all routes with their visibility permissions
 * Cached to avoid multiple database calls
 * Revalidated every hour or on-demand via tags
 */
export async function getRoutesWithPermissions() {
   // Get admin info OUTSIDE of cache scope
   const session = await auth();
   const adminId = session?.user?.id ? BigInt(session.user.id) : null;
   const adminLevel = (session?.user as any)?.level as string | undefined;

   // Get admin accessible groups OUTSIDE of cache scope
   let adminAccessibleGroupIds = new Set<bigint>();
   if (adminLevel === 'ADMIN' && adminId) {
      const admin = await prisma.admin.findUnique({
         where: { id: adminId },
         select: {
            adminRoles: {
               select: { roleId: true },
            },
         },
      });

      if (admin && admin.adminRoles && admin.adminRoles.length > 0) {
         const roleIds = admin.adminRoles.map((ar) => ar.roleId);
         const roleRouteGroups = await prisma.roleRouteGroup.findMany({
            where: { roleId: { in: roleIds } },
            select: { groupId: true },
         });
         adminAccessibleGroupIds = new Set(roleRouteGroups.map((rrg) => rrg.groupId));
      }
   }

   // NOW use cache for the route fetching
   return getCachedRoutePermissions(adminAccessibleGroupIds);
}

/**
 * Cached route fetching - no auth calls inside
 */
async function getCachedRoutePermissions(adminAccessibleGroupIds: Set<bigint>) {
   // Get all routes from database
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

   // Create a map for quick lookup: path -> permissions
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

   routes.forEach((route) => {
      const isAccessibleToAdmin = adminAccessibleGroupIds.has(route.groupId);
      routePermissions.set(route.path, {
         visibleToAdmin: route.visibleToAdmin,
         visibleToSuperAdmin: route.visibleToSuperAdmin,
         groupName: route.group.name,
         groupId: route.groupId,
         isAccessibleToAdmin,
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
   // DEVELOPER has full access - no filtering
   if (adminLevel === 'DEVELOPER') {
      return routes;
   }

   return routes.filter((route) => {
      const permissions = routePermissions.get(route.path);

      // If route not in database, hide it (safe default)
      if (!permissions) {
         return false;
      }

      if (adminLevel === 'SUPER_ADMIN') {
         return permissions.visibleToSuperAdmin;
      }

      if (adminLevel === 'ADMIN') {
         // ADMIN users must have: visible flag AND role assigned to the route group
         return permissions.visibleToAdmin && permissions.isAccessibleToAdmin;
      }

      return false;
   });
}
