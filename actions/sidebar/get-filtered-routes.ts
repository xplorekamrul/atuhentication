'use server';

import { auth } from '@/lib/auth';
import { getCachedAdminAccessiblePaths } from '@/lib/permissions/permissions';
import { getCachedTotalRoutesCount } from '@/lib/permissions/rbac-cache';
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

export type FilteredRoutesResult = {
   routes: NavNodeData[];
   noRoutesInDatabase: boolean;
};

/**
 * Get all accessible routes from Redis cache based on user level and roles.
 */
export async function getAccessibleRoutePaths(adminId: string, level: string): Promise<string[]> {
   if (level === 'DEVELOPER') {
      return ['*'];
   }

   return getCachedAdminAccessiblePaths(adminId, level);
}

/**
 * Get filtered sidebar navigation paths based on user level and cached database permissions.
 * Returns only serializable data (no React components).
 */
export async function getFilteredSidebarRoutes(
   hardcodedRoutes: NavNodeData[]
): Promise<FilteredRoutesResult> {
   try {
      const session = await auth();
      if (!session?.user?.id) {
         return { routes: [], noRoutesInDatabase: false };
      }

      const level = (session.user as any)?.level as string | undefined;
      const userType = (session.user as any)?.userType as string | undefined;

      if (!level || !userType || userType !== 'ADMIN') {
         return { routes: [], noRoutesInDatabase: false };
      }

      // DEVELOPER has unrestricted access
      if (level === 'DEVELOPER') {
         return { routes: hardcodedRoutes, noRoutesInDatabase: false };
      }

      // Check cached total routes count first
      const totalRoutesInDb = await getCachedTotalRoutesCount();
      if (totalRoutesInDb === 0 && (level === 'SUPER_ADMIN' || level === 'ADMIN')) {
         return { routes: [], noRoutesInDatabase: true };
      }

      // Fetch cached accessible routes (0 DB queries on cache hit)
      const accessibleRoutes = await getAccessibleRoutePaths(session.user.id, level);
      if (accessibleRoutes.length === 0) {
         return { routes: [], noRoutesInDatabase: false };
      }

      const filtered = filterNavNodes(hardcodedRoutes, accessibleRoutes);
      return { routes: filtered, noRoutesInDatabase: false };
   } catch (error) {
      console.error('[getFilteredSidebarRoutes] Error filtering sidebar routes:', error);
      return { routes: [], noRoutesInDatabase: false };
   }
}

/**
 * Recursively filter navigation nodes based on accessible routes using O(1) Set lookup
 * for static routes and memoized pattern matching for dynamic routes.
 */
function filterNavNodes(
   nodes: NavNodeData[],
   accessibleRoutes: string[]
): NavNodeData[] {
   const hasFullAccess = accessibleRoutes.includes('*');
   const accessibleSet = new Set(accessibleRoutes);
   const dynamicRoutes = accessibleRoutes.filter((r) => r.includes('['));

   function filterNodes(currentNodes: NavNodeData[]): NavNodeData[] {
      return currentNodes
         .map((node) => {
            if ('children' in node) {
               const filteredChildren = filterNodes(node.children);
               if (filteredChildren.length === 0) {
                  return null;
               }
               return {
                  ...node,
                  children: filteredChildren,
               };
            }

            const isAccessible =
               hasFullAccess ||
               accessibleSet.has(node.href) ||
               dynamicRoutes.some((route) => matchesPattern(route, node.href));

            return isAccessible ? node : null;
         })
         .filter((node): node is NavNodeData => node !== null);
   }

   return filterNodes(nodes);
}
