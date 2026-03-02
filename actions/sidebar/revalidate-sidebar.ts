'use server';

import { developerActionClient } from '@/lib/safe-action/clients';
import { revalidateTag } from 'next/cache';

/**
 * Revalidate sidebar cache after route permission changes
 * Called after creating, updating, or deleting routes
 */
export const revalidateSidebarCache = developerActionClient.action(
   async () => {
      try {
         revalidateTag('sidebar-routes', 'max');
         return { ok: true as const };
      } catch (error) {
         console.error('Failed to revalidate sidebar cache:', error);
         return { ok: false as const, error: 'Failed to revalidate cache' };
      }
   }
);
