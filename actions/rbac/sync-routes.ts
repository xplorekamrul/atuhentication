"use server";

import { auth } from "@/lib/auth";
import { invalidateAdminPermissionsCache } from "@/lib/permissions/permissions";
import { getCachedAllRouteGroups, getCachedAllRoutes } from "@/lib/permissions/rbac-cache";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

interface SyncResult {
   ok: boolean;
   message: string;
   addedCount?: number;
   totalRoutes?: number;
   routes?: Array<{
      path: string;
      name: string;
   }>;
}

// Routes to exclude from syncing to database
const EXCLUDED_ROUTES = [
   "/",
   "/rbac",
   "/admin",
   "/admin/login",
   "/admin/rbac",
   "/developer/api-tester",
   "/forgot",
   "/forgot/reset",
   "/unauthorized",
   "/forgot/verify",
   "/login",
   "/register",
   
];

// Generate routes from app directory
function generateRoutes(): string[] {
   const appDir = path.join(process.cwd(), "app");
   const routes: string[] = [];

   function scanDirectory(dir: string, prefix = "") {
      const files = fs.readdirSync(dir);

      files.forEach((file) => {
         const fullPath = path.join(dir, file);
         const stat = fs.statSync(fullPath);

         if (stat.isDirectory()) {
            // Skip special directories
            if (file.startsWith(".") || file.startsWith("_")) {
               return;
            }

            // Handle route groups (directories in parentheses)
            let routeSegment = file;
            if (file.startsWith("(") && file.endsWith(")")) {
               routeSegment = "";
            }

            const newPrefix = prefix + (routeSegment ? "/" + routeSegment : "");

            // Recursively scan subdirectories
            scanDirectory(fullPath, newPrefix);
         } else if (file === "page.tsx" || file === "page.ts") {
            // Add route if page file exists
            if (prefix) {
               routes.push(prefix);
            } else {
               routes.push("/");
            }
         }
      });
   }

   scanDirectory(appDir);

   // Remove duplicates, filter excluded routes, and sort
   const uniqueRoutes = [...new Set(routes)];
   const filteredRoutes = uniqueRoutes.filter(route => !EXCLUDED_ROUTES.includes(route));
   return filteredRoutes.sort();
}

// Extract route name from path
function extractRouteName(routePath: string): string {
   let cleanPath = routePath.startsWith("/") ? routePath.slice(1) : routePath;

   if (!cleanPath) return "Home";

   const segments = cleanPath.split("/").filter(Boolean);
   let lastSegment = segments[segments.length - 1];

   if (lastSegment && lastSegment.includes("[") && lastSegment.includes("]")) {
      lastSegment = segments[segments.length - 2] || lastSegment;
   }

   if (!lastSegment) return "Home";

   return lastSegment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
}

export async function syncRoutesToDatabase(): Promise<SyncResult> {
   const session = await auth();

   // Only allow DEVELOPER and SUPER_ADMIN
   const level = (session?.user as any)?.level;
   if (
      !session?.user?.id ||
      (level !== "DEVELOPER" && level !== "SUPER_ADMIN")
   ) {
      return {
         ok: false,
         message: "Unauthorized. Only developers and super admins can sync routes.",
      };
   }

   try {
      // Generate routes
      const generatedRoutes = generateRoutes();

      const GroupName = "Not Assign Routes";

      // Check or create "Not Assign Routes" group
      let routeGroup = await prisma.routeGroup.findUnique({
         where: { name: GroupName },
      });

      if (!routeGroup) {
         routeGroup = await prisma.routeGroup.create({
            data: {
               name: GroupName,
            },
         });
      }

      // Get all existing routes from database
      const existingRoutes = await prisma.route.findMany({
         select: { path: true },
      });
      const existingPaths = new Set(existingRoutes.map((r) => r.path));

      // Filter new routes
      const newRoutes = generatedRoutes.filter(
         (route) => !existingPaths.has(route)
      );

      // Insert new routes
      let addedCount = 0;
      const addedRoutes: Array<{ path: string; name: string }> = [];

      for (const routePath of newRoutes) {
         const routeName = extractRouteName(routePath);

         try {
            await prisma.route.upsert({
               where: { path: routePath },
               update: {},
               create: {
                  path: routePath,
                  name: routeName,
                  groupId: routeGroup.id,
                  visibleToAdmin: true,
                  editableByAdmin: false,
                  visibleToSuperAdmin: true,
                  editableBySuperAdmin: true,
               },
            });

            addedCount++;
            addedRoutes.push({ path: routePath, name: routeName });
         } catch (err) {
            console.warn(`Failed to sync route ${routePath}:`, err);
         }
      }

      if (addedCount > 0) {
         await invalidateAdminPermissionsCache();
      }

      return {
         ok: true,
         message: `Successfully synced ${addedCount} new routes to database`,
         addedCount,
         totalRoutes: generatedRoutes.length,
         routes: addedRoutes,
      };
   } catch (error) {
      console.error("Error syncing routes:", error);
      return {
         ok: false,
         message: `Error syncing routes: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
   }
}

// Get all routes and route groups (served from Next.js "use cache")
export async function getAllRoutesAndGroups() {
   const session = await auth();

   const level = (session?.user as any)?.level;
   if (
      !session?.user?.id ||
      (level !== "DEVELOPER" && level !== "SUPER_ADMIN")
   ) {
      return {
         ok: false,
         message: "Unauthorized",
         routes: [],
         routeGroups: [],
      };
   }

   try {
      const [routesData, routeGroupsData] = await Promise.all([
         getCachedAllRoutes(),
         getCachedAllRouteGroups(),
      ]);

      return {
         ok: true,
         routes: routesData.items.map((r) => ({
            id: r.id,
            path: r.path,
            name: r.name,
            groupId: r.groupId,
            group: r.group,
            createdAt: new Date(r.createdAt),
         })),
         routeGroups: routeGroupsData.items,
      };
   } catch (error) {
      console.error("Error fetching routes:", error);
      return {
         ok: false,
         message: "Error fetching routes",
         routes: [],
         routeGroups: [],
      };
   }
}
