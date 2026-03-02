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

/**
 * Get all accessible routes from database based on user level and roles
 * This is cached and revalidated on demand
 */
export async function getAccessibleRoutePaths(adminId: bigint, level: string): Promise<string[]> {
   'use cache';

   // DEVELOPER has full access
   if (level === 'DEVELOPER') {
      return []; // Empty array means full access
   }

   // SUPER_ADMIN: get all visible routes
   if (level === 'SUPER_ADMIN') {
      const routes = await prisma.route.findMany({
         where: { visibleToSuperAdmin: true },
         select: { path: true },
      });
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
         return [];
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

      return routes.map((r) => r.path);
   }

   return [];
}

/**
 * Get filtered sidebar navigation paths based on user level and database permissions
 * Returns only serializable data (no React components)
 */
export async function getFilteredSidebarRoutes(
   hardcodedRoutes: NavNodeData[]
): Promise<NavNodeData[]> {
   try {
      const session = await auth();
      if (!session?.user?.id) {
         console.log('[getFilteredSidebarRoutes] No session or user ID');
         return [];
      }

      const level = (session.user as any)?.level as string | undefined;
      const userType = (session.user as any)?.userType as string | undefined;

      if (!level || !userType) {
         console.log('[getFilteredSidebarRoutes] No level or userType');
         return [];
      }

      console.log('[getFilteredSidebarRoutes] User level:', level, 'userType:', userType);

      // Only admins can access admin routes
      if (userType !== 'ADMIN') {
         console.log('[getFilteredSidebarRoutes] Not an admin user');
         return [];
      }

      // DEVELOPER has full access - no need to check permissions
      if (level === 'DEVELOPER') {
         console.log('[getFilteredSidebarRoutes] DEVELOPER user - returning all routes');
         return hardcodedRoutes;
      }

      // Get accessible routes for ADMIN and SUPER_ADMIN
      const adminId = BigInt(session.user.id);
      const accessibleRoutes = await getAccessibleRoutePaths(adminId, level);

      console.log('[getFilteredSidebarRoutes] Accessible routes:', accessibleRoutes);

      // If empty array for DEVELOPER, return all routes
      if (accessibleRoutes.length === 0 && level === 'DEVELOPER') {
         return hardcodedRoutes;
      }

      // Filter routes recursively
      return filterNavNodes(hardcodedRoutes, accessibleRoutes);
   } catch (error) {
      console.error('[getFilteredSidebarRoutes] Error filtering sidebar routes:', error);
      // On error, return empty array to be safe
      return [];
   }
}

/**
 * Recursively filter navigation nodes based on accessible routes
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
