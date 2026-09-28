"use server";

import { prisma } from "@/lib/prisma";
import { developerActionClient } from "@/lib/safe-action/clients";
import { z } from "zod";

// Get routes assigned to a route group
export const getGroupRoutes = developerActionClient
   .schema(z.object({ groupId: z.string() }))
   .action(async ({ parsedInput: { groupId } }) => {
      const routes = await prisma.route.findMany({
         where: { groupId: BigInt(groupId) },
         select: { id: true },
      });

      return {
         ok: true,
         routeIds: routes.map((r) => r.id.toString()),
      };
   });

// Assign routes to a route group
export const assignRoutesToGroup = developerActionClient
   .schema(
      z.object({
         groupId: z.string(),
         routeIds: z.array(z.string()),
      })
   )
   .action(async ({ parsedInput: { groupId, routeIds } }) => {
      const groupIdBigInt = BigInt(groupId);

      // Convert routeIds to BigInt set for comparison
      const routeIdSet = new Set(routeIds.map((id) => BigInt(id)));

      // Update all selected routes to belong to this group
      if (routeIds.length > 0) {
         await prisma.route.updateMany({
            where: {
               id: {
                  in: Array.from(routeIdSet),
               },
            },
            data: {
               groupId: groupIdBigInt,
            },
         });
      }

      return {
         ok: true,
         message: "Routes assigned successfully",
      };
   });
