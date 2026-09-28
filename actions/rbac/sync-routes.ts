"use server";

import { auth } from "@/lib/auth";
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

            // Check if this directory has a page.tsx or page.ts
            const pageFile = fs
               .readdirSync(fullPath)
               .find((f) => f === "page.tsx" || f === "page.ts");
            if (pageFile) {
               routes.push(newPrefix || "/");
            }

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

   // Remove duplicates and sort
   return [...new Set(routes)].sort();
}

// Extract route name from path
function extractRouteName(routePath: string): string {
   let cleanPath = routePath.startsWith("/") ? routePath.slice(1) : routePath;

   if (!cleanPath) return "Home";

   const segments = cleanPath.split("/");
   let lastSegment = segments[segments.length - 1];

   if (lastSegment.includes("[") && lastSegment.includes("]")) {
      lastSegment = segments[segments.length - 2] || lastSegment;
   }

   return lastSegment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
}

export async function syncRoutesToDatabase(): Promise<SyncResult> {
   const session = await auth();

   // Only allow DEVELOPER and SUPER_ADMIN
   if (
      !session?.user?.id ||
      (session.user.level !== "DEVELOPER" &&
         session.user.level !== "SUPER_ADMIN")
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

         await prisma.route.create({
            data: {
               path: routePath,
               name: routeName,
               groupId: routeGroup.id,
               visibleToAdmin: true,
               editableByAdmin: true,
               visibleToSuperAdmin: true,
               editableBySuperAdmin: true,
            },
         });

         addedCount++;
         addedRoutes.push({ path: routePath, name: routeName });
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

// Get all routes and route groups
export async function getAllRoutesAndGroups() {
   const session = await auth();

   if (
      !session?.user?.id ||
      (session.user.level !== "DEVELOPER" &&
         session.user.level !== "SUPER_ADMIN")
   ) {
      return {
         ok: false,
         message: "Unauthorized",
         routes: [],
         routeGroups: [],
      };
   }

   try {
      const [routes, routeGroups] = await Promise.all([
         prisma.route.findMany({
            select: {
               id: true,
               path: true,
               name: true,
               groupId: true,
               group: { select: { id: true, name: true } },
               createdAt: true,
            },
            orderBy: { path: "asc" },
         }),
         prisma.routeGroup.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
         }),
      ]);

      return {
         ok: true,
         routes: routes.map((r) => ({
            id: r.id.toString(),
            path: r.path,
            name: r.name,
            groupId: r.groupId.toString(),
            group: { id: r.group.id.toString(), name: r.group.name },
            createdAt: r.createdAt,
         })),
         routeGroups: routeGroups.map((rg) => ({
            id: rg.id.toString(),
            name: rg.name,
         })),
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
