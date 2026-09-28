"use client";

import { getEditPermissionForRoute } from "@/actions/user-permissions/edit-permissions";
import { useEffect, useState } from "react";

/**
 * Hook to check if current user has edit permission for a route
 * Returns:
 * - null: Loading state
 * - true: User has edit permission
 * - false: User only has view permission
 */
export function useEditPermission(routePath: string) {
   const [hasEditPermission, setHasEditPermission] = useState<boolean | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<Error | null>(null);

   useEffect(() => {
      let isMounted = true;

      async function checkPermission() {
         try {
            setIsLoading(true);
            const result = await getEditPermissionForRoute(routePath);

            if (isMounted) {
               // null means full access, convert to true
               setHasEditPermission(result === null ? true : result);
               setError(null);
            }
         } catch (err) {
            if (isMounted) {
               setError(err instanceof Error ? err : new Error("Unknown error"));
               setHasEditPermission(false);
            }
         } finally {
            if (isMounted) {
               setIsLoading(false);
            }
         }
      }

      checkPermission();

      return () => {
         isMounted = false;
      };
   }, [routePath]);

   return { hasEditPermission, isLoading, error };
}
