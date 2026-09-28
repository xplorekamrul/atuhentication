"use server";

import { serializeBigInt, toBigIntOrNull } from "@/lib/bigint-utils";
import { prisma } from "@/lib/prisma";
import { developerActionClient } from "@/lib/safe-action/clients";
import { roleRouteGroupAssignSchema } from "@/lib/validations/rbac";

export const assignRouteGroupsToRole = developerActionClient
   .inputSchema(roleRouteGroupAssignSchema)
   .action(async ({ parsedInput }) => {
      const { roleId, groupIds } = parsedInput;
      const rId = toBigIntOrNull(roleId);

      if (!rId) {
         return { ok: false as const, error: "Invalid role ID" };
      }

      // Check if role exists
      const role = await prisma.role.findUnique({
         where: { id: rId },
      });

      if (!role) {
         return { ok: false as const, error: "Role not found" };
      }

      // Convert group IDs to BigInt
      const gIds = groupIds
         .map((id) => toBigIntOrNull(id))
         .filter((id) => id !== null);

      if (gIds.length === 0) {
         return { ok: false as const, error: "No valid route groups provided" };
      }

      // Verify all groups exist
      const groups = await prisma.routeGroup.findMany({
         where: { id: { in: gIds } },
      });

      if (groups.length !== gIds.length) {
         return { ok: false as const, error: "Some route groups not found" };
      }

      // Delete existing assignments
      await prisma.roleRouteGroup.deleteMany({
         where: { roleId: rId },
      });

      // Create new assignments
      await prisma.roleRouteGroup.createMany({
         data: gIds.map((groupId) => ({
            roleId: rId,
            groupId,
         })),
      });

      // Fetch updated assignments
      const assignments = await prisma.roleRouteGroup.findMany({
         where: { roleId: rId },
         select: {
            roleId: true,
            groupId: true,
            group: { select: { id: true, name: true } },
         },
      });

      return { ok: true as const, data: serializeBigInt(assignments) };
   });

export const getRoleRouteGroups = developerActionClient
   .inputSchema(
      require("zod").object({
         roleId: require("zod").string(),
      })
   )
   .action(async ({ parsedInput }) => {
      const { roleId } = parsedInput;
      const rId = toBigIntOrNull(roleId);

      if (!rId) {
         return { ok: false as const, error: "Invalid role ID" };
      }

      const assignments = await prisma.roleRouteGroup.findMany({
         where: { roleId: rId },
         select: {
            groupId: true,
            group: { select: { id: true, name: true } },
         },
      });

      return { ok: true as const, data: serializeBigInt(assignments) };
   });
