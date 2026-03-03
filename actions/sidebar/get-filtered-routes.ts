'use server';

import { auth } from '@/lib/auth';
import { matchesPattern } from '@/lib/permissions/route-pattern-matcher';
import { prisma } from '@/lib/prisma';

export type NavItemData = {
   label: string;
   href: string;
};

export type NavGroupData = {
   label: string;
   children: NavItemData[];
};

export type NavNodeData = NavItemData | NavGroupData;

export type FilteredRoutesResult = {
   routes: NavNodeData[];
   noRoutesInDatabase: boolean;
};

/**
 * Get all accessible routes from database based on user level and roles
 * 
 * Returns routes that are VISIBLE to the user's level.
 * Visibility controls sidebar display.
 * Editability controls what actions can be performed (checked in proxy/permissions).
 */
export async function getAccessibleRoutePaths(adminId: bigint, level: string): Promise<string[]> {
   // DEVELOPER has full access
   if (level === 'DEVELOPER') {
      return []; // Empty array means full access
   }

   // SUPER_ADMIN: get all routes visible to super admin
   if (level === 'SUPER_ADMIN') {
      const routes = await prisma.route.findMany({
         where: {
            visibleToSuperAdmin: true,
         },
         select: { path: true },
      });
      console.log('[getAccessibleRoutePaths] SUPER_ADMIN routes:', routes.map(r => r.path));
      return routes.map((r) => r.path);
   }

   // ADMIN: get visible routes from assigned roles
   if (level === 'ADMIN') {
      const admin = await prisma.admin.findUnique({
         where: { id: adminId },
         select: {
            adminRoles: {
               select: { roleId: true },
            },
         },
      });

      if (!admin || admin.adminRoles.length === 0) {
         console.log('[getAccessibleRoutePaths] ADMIN has no roles');
         return [];
      }

      const roleIds = admin.adminRoles.map((ar) => ar.roleId);
      console.log('[getAccessibleRoutePaths] ADMIN roleIds:', roleIds);

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

      console.log('[getAccessibleRoutePaths] ADMIN routes:', routes.map(r => r.path));
      return routes.map((r) => r.path);
   }

   return [];
}

/**
 * Get filtered sidebar navigation paths based on user level and database permissions
 * Returns only serializable data (no React components)
 * 
 * Logic:
 * - DEVELOPER: Show all hardcoded nav items (no filtering)
 * - SUPER_ADMIN: Show only nav items where path exists in database with visibleToSuperAdmin: true
 * - ADMIN: Show only nav items where path exists in database with visibleToAdmin: true AND user has role permission
 *          If ADMIN has no roles, show NO nav items (empty sidebar)
 */
export async function getFilteredSidebarRoutes(
   hardcodedRoutes: NavNodeData[]
): Promise<FilteredRoutesResult> {
   try {
      const session = await auth();
      if (!session?.user?.id) {
         console.log('[getFilteredSidebarRoutes] No session or user ID');
         return { routes: [], noRoutesInDatabase: false };
      }

      const level = (session.user as any)?.level as string | undefined;
      const userType = (session.user as any)?.userType as string | undefined;

      if (!level || !userType) {
         console.log('[getFilteredSidebarRoutes] No level or userType');
         return { routes: [], noRoutesInDatabase: false };
      }

      console.log('[getFilteredSidebarRoutes] User level:', level, 'userType:', userType);

      // Only admins can access admin routes
      if (userType !== 'ADMIN') {
         console.log('[getFilteredSidebarRoutes] Not an admin user');
         return { routes: [], noRoutesInDatabase: false };
      }

      // DEVELOPER has full access - show all hardcoded nav items
      if (level === 'DEVELOPER') {
         console.log('[getFilteredSidebarRoutes] DEVELOPER user - returning all routes');
         return { routes: hardcodedRoutes, noRoutesInDatabase: false };
      }

      // Check if there are any routes in the database at all
      const totalRoutesInDb = await prisma.route.count();
      console.log('[getFilteredSidebarRoutes] Total routes in database:', totalRoutesInDb);

      // If no routes in database for SUPER_ADMIN or ADMIN, return special flag
      if (totalRoutesInDb === 0 && (level === 'SUPER_ADMIN' || level === 'ADMIN')) {
         console.log('[getFilteredSidebarRoutes] No routes in database');
         return { routes: [], noRoutesInDatabase: true };
      }

      // For ADMIN: check if user has any roles assigned
      if (level === 'ADMIN') {
         const admin = await prisma.admin.findUnique({
            where: { id: BigInt(session.user.id) },
            select: { adminRoles: { select: { roleId: true } } },
         });

         if (!admin || admin.adminRoles.length === 0) {
            console.log('[getFilteredSidebarRoutes] ADMIN has no roles assigned - showing empty sidebar');
            return { routes: [], noRoutesInDatabase: false };
         }
      }

      // Get accessible routes for SUPER_ADMIN and ADMIN
      const adminId = BigInt(session.user.id);
      const accessibleRoutes = await getAccessibleRoutePaths(adminId, level);

      console.log('[getFilteredSidebarRoutes] Accessible routes:', accessibleRoutes);

      // Filter hardcoded nav items against accessible routes from database
      const filtered = filterNavNodes(hardcodedRoutes, accessibleRoutes);
      return { routes: filtered, noRoutesInDatabase: false };
   } catch (error) {
      console.error('[getFilteredSidebarRoutes] Error filtering sidebar routes:', error);
      // On error, return empty array to be safe
      return { routes: [], noRoutesInDatabase: false };
   }
}


/**
 * Recursively filter navigation nodes based on accessible routes
 * Only includes nav items where the path matches an accessible route from the database
 */
function filterNavNodes(
   nodes: NavNodeData[],
   accessibleRoutes: string[]
): NavNodeData[] {
   return nodes
      .map((node) => {
         // Handle groups
         if ('children' in node) {
            const filteredChildren = filterNavNodes(
               node.children,
               accessibleRoutes
            );

            // Only include group if it has visible children
            if (filteredChildren.length === 0) {
               return null;
            }

            return {
               ...node,
               children: filteredChildren,
            };
         }

         // Handle individual items - check if route is accessible
         const isAccessible = accessibleRoutes.some((route) =>
            matchesPattern(route, node.href)
         );

         console.log(`[filterNavNodes] Route: ${node.href}, Accessible: ${isAccessible}`);
         return isAccessible ? node : null;
      })
      .filter((node): node is NavNodeData => node !== null);
}
