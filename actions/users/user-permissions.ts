"use server";

import { auth } from "@/lib/auth";
import { getAdminAccessibleRoutes } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/prisma";
import { DEFAULT_REDIS_CACHE_TTL_SECONDS, getOrSetCache } from "@/lib/redis/cache";

export type RouteWithGroup = {
   id: string;
   path: string;
   name: string | null;
   groupId: string;
   group: {
      id: string;
      name: string;
   };
};

/**
 * Get accessible routes for the current admin
 * Server-side only - used by components via server actions
 */
export async function getAccessibleRoutes() {
   try {
      const session = await auth();

      if (!session?.user?.id) {
         return null;
      }

      const level = (session.user as { level?: string }).level;
      if (level === "SUPER_ADMIN" || level === "DEVELOPER") {
         return null; // null means full access
      }

      const paths = await getAdminAccessibleRoutes(session.user.id, level);
      if (paths === null) return null;

      return Array.from(new Set([...paths, "/admin/help", "/admin/profile", "/help", "/profile"]));
   } catch (error) {
      console.error("Error fetching accessible routes:", error);
      return null;
   }
}

async function getCachedDatabaseRoutes(): Promise<RouteWithGroup[]> {
   return getOrSetCache({
      key: "rbac:sidebar:db-routes",
      tags: ["rbac-data", "rbac-routes", "sidebar-routes"],
      ttlSeconds: DEFAULT_REDIS_CACHE_TTL_SECONDS,
      fetcher: async () => {
         const routes = await prisma.route.findMany({
            select: {
               id: true,
               path: true,
               name: true,
               groupId: true,
               group: {
                  select: {
                     id: true,
                     name: true,
                  },
               },
            },
            orderBy: [{ group: { name: "asc" } }, { path: "asc" }],
         });

         return routes.map((route) => ({
            ...route,
            id: String(route.id),
            groupId: String(route.groupId),
            group: {
               ...route.group,
               id: String(route.group.id),
            },
         }));
      },
   });
}

/**
 * Get all routes from the database
 * Used by sidebar to display navigation
 */
export async function getAllRoutes(): Promise<RouteWithGroup[]> {
   try {
      const session = await auth();
      const level = (session?.user as { level?: string } | undefined)?.level;

      if (level === "DEVELOPER") {
         return getHardcodedRoutes();
      }

      return getCachedDatabaseRoutes();
   } catch (error) {
      console.error("Error fetching routes:", error);
      return [];
   }
}

/**
 * Hardcoded routes for SUPER_ADMIN and DEVELOPER users
 * These are the actual pages available in the app
 */
function getHardcodedRoutes(): RouteWithGroup[] {
   return [
      // HR Group
      {
         id: "1",
         path: "/daily-attendance",
         name: "Daily Attendance",
         groupId: "1",
         group: { id: "1", name: "HR" },
      },
      {
         id: "2",
         path: "/attendance-report",
         name: "Attendance Report",
         groupId: "1",
         group: { id: "1", name: "HR" },
      },
      {
         id: "3",
         path: "/monthly-attendance",
         name: "Monthly Attendance",
         groupId: "1",
         group: { id: "1", name: "HR" },
      },
      {
         id: "4",
         path: "/holidays",
         name: "Holidays",
         groupId: "1",
         group: { id: "1", name: "HR" },
      },
      {
         id: "5",
         path: "/leave",
         name: "Leave Management",
         groupId: "1",
         group: { id: "1", name: "HR" },
      },
      {
         id: "6",
         path: "/showcause",
         name: "Showcause",
         groupId: "1",
         group: { id: "1", name: "HR" },
      },
      // Employees Group
      {
         id: "7",
         path: "/employees",
         name: "Employees",
         groupId: "2",
         group: { id: "2", name: "Employees" },
      },
      // Admin Group
      {
         id: "8",
         path: "/users",
         name: "Users",
         groupId: "3",
         group: { id: "3", name: "Admin" },
      },
      {
         id: "9",
         path: "/rbac",
         name: "RBAC",
         groupId: "3",
         group: { id: "3", name: "Admin" },
      },
      {
         id: "10",
         path: "/devices",
         name: "Devices",
         groupId: "3",
         group: { id: "3", name: "Admin" },
      },
      {
         id: "11",
         path: "/shifts",
         name: "Shifts",
         groupId: "3",
         group: { id: "3", name: "Admin" },
      },
      {
         id: "12",
         path: "/hr",
         name: "HR Settings",
         groupId: "3",
         group: { id: "3", name: "Admin" },
      },
   ];
}
