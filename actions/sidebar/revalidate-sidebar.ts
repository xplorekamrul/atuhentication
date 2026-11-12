'use server';

import { invalidateAdminPermissionsCache } from '@/lib/permissions/permissions';
import { invalidateCacheTags } from '@/lib/redis/cache';
import { developerActionClient } from '@/lib/safe-action/clients';

/**
 * Revalidate sidebar and permission caches in Redis after route permission changes.
 * Called after creating, updating, or deleting routes.
 */
export const revalidateSidebarCache = developerActionClient.action(
   async () => {
      try {
         await Promise.all([
            invalidateCacheTags('sidebar-routes'),
            invalidateAdminPermissionsCache(),
         ]);
         return { ok: true as const };
      } catch (error) {
         console.error('Failed to revalidate sidebar cache:', error);
         return { ok: false as const, error: 'Failed to revalidate cache' };
      }
   }
);
