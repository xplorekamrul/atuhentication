"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

      const adminId = BigInt(session.user.id);
      const admin = await prisma.admin.findUnique({
         where: { id: adminId },
         select: {
            level: true,
            adminRoles: {
               select: { roleId: true },
            },
         },
      });

      if (!admin) {
         return null;
      }

      // SUPER_ADMIN and DEVELOPER have full access
      if (admin.level === "SUPER_ADMIN" || admin.level === "DEVELOPER") {
         return null; // null means full access
      }

      // ADMIN users: get routes from their assigned roles + unrestricted paths
      if (admin.level === "ADMIN" && admin.adminRoles.length > 0) {
         const roleIds = admin.adminRoles.map((ar) => ar.roleId);
         const roleRouteGroups = await prisma.roleRouteGroup.findMany({
            where: { roleId: { in: roleIds } },
            select: {
               group: {
                  select: {
                     routes: {
                        select: { path: true },
                     },
                  },
               },
            },
         });

         const paths = new Set<string>();
         roleRouteGroups.forEach((rrg) => {
            rrg.group.routes.forEach((route) => {
               paths.add(route.path);
            });
         });

         // Add unrestricted paths
         paths.add("/help");
         paths.add("/profile");

         return Array.from(paths);
      }

      return [];
   } catch (error) {
      console.error("Error fetching accessible routes:", error);
      return null;
   }
}

/**
 * Get all routes from the database
 * Used by sidebar to display navigation
 */
export async function getAllRoutes(): Promise<RouteWithGroup[]> {
   try {
      const session = await auth();
      const level = (session?.user as any)?.level as string | undefined;

      // For SUPER_ADMIN and DEVELOPER, return hardcoded routes
      // if (level === "SUPER_ADMIN" || level === "DEVELOPER") {
      if (level === "DEVELOPER") {
         return getHardcodedRoutes();
      }

      // For ADMIN users, fetch from database
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
