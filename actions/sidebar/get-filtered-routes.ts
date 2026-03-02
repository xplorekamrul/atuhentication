'use server';

import { auth } from '@/lib/auth';
import { getUserAccessibleRoutes } from '@/lib/permissions/permissions';
import { matchesPattern } from '@/lib/permissions/route-pattern-matcher';

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

      const userLevel = (session.user as any)?.userLvel as
         | 'ADMIN'
         | 'SUPER_ADMIN'
         | 'DEVELOPER'
         | undefined;

      if (!userLevel) {
         console.log('[getFilteredSidebarRoutes] No user level');
         return [];
      }

      console.log('[getFilteredSidebarRoutes] User level:', userLevel);

      // DEVELOPER has full access - no need to check permissions
      if (userLevel === 'DEVELOPER') {
         console.log('[getFilteredSidebarRoutes] DEVELOPER user - returning all routes');
         return hardcodedRoutes;
      }

      // Get accessible routes for ADMIN and SUPER_ADMIN
      const userId = BigInt(session.user.id);
      const accessibleRoutes = await getUserAccessibleRoutes(userId);

      console.log('[getFilteredSidebarRoutes] Accessible routes:', accessibleRoutes);

      // If null, user has full access (shouldn't happen for ADMIN/SUPER_ADMIN)
      if (accessibleRoutes === null) {
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
