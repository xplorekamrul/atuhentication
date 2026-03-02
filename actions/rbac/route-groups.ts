"use server";

import { serializeBigInt, toBigIntOrNull } from "@/lib/bigint-utils";
import { prisma } from "@/lib/prisma";
import { developerActionClient } from "@/lib/safe-action/clients";
import {
   routeGroupCreateSchema,
   routeGroupDeleteSchema,
   routeGroupListSchema,
   routeGroupUpdateSchema,
} from "@/lib/validations/rbac";
import { Prisma } from "@prisma/client";

export const listRouteGroups = developerActionClient
   .inputSchema(routeGroupListSchema)
   .action(async ({ parsedInput }) => {
      const { page, pageSize, q } = parsedInput;

      const where: Prisma.RouteGroupWhereInput = q
         ? { name: { contains: q } }
         : {};

      const [items, total] = await Promise.all([
         prisma.routeGroup.findMany({
            where,
            orderBy: { name: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
               id: true,
               name: true,
               createdAt: true,
               _count: {
                  select: { routes: true, roleRouteGroups: true },
               },
            },
         }),
         prisma.routeGroup.count({ where }),
      ]);

      return {
         ok: true as const,
         items: serializeBigInt(items),
         total,
         page,
         pageSize,
      };
   });

export const createRouteGroup = developerActionClient
   .inputSchema(routeGroupCreateSchema)
   .action(async ({ parsedInput }) => {
      const { name } = parsedInput;

      // Check if route group already exists
      const existing = await prisma.routeGroup.findUnique({
         where: { name },
      });

      if (existing) {
         return { ok: false as const, error: "Route group already exists" };
      }

      const group = await prisma.routeGroup.create({
         data: { name },
         select: { id: true, name: true, createdAt: true },
      });

      return { ok: true as const, data: serializeBigInt(group) };
   });

export const updateRouteGroup = developerActionClient
   .inputSchema(routeGroupUpdateSchema)
   .action(async ({ parsedInput }) => {
      const { id, name } = parsedInput;
      const groupId = toBigIntOrNull(id);

      if (!groupId) {
         return { ok: false as const, error: "Invalid route group ID" };
      }

      // Check if group exists
      const group = await prisma.routeGroup.findUnique({
         where: { id: groupId },
      });

      if (!group) {
         return { ok: false as const, error: "Route group not found" };
      }

      // Check if new name is already taken
      if (name !== group.name) {
         const existing = await prisma.routeGroup.findUnique({
            where: { name },
         });
         if (existing) {
            return { ok: false as const, error: "Route group name already exists" };
         }
      }

      const updated = await prisma.routeGroup.update({
         where: { id: groupId },
         data: { name },
         select: { id: true, name: true, createdAt: true },
      });

      return { ok: true as const, data: serializeBigInt(updated) };
   });

export const deleteRouteGroup = developerActionClient
   .inputSchema(routeGroupDeleteSchema)
   .action(async ({ parsedInput }) => {
      const { id } = parsedInput;
      const groupId = toBigIntOrNull(id);

      if (!groupId) {
         return { ok: false as const, error: "Invalid route group ID" };
      }

      // Check if group has routes
      const routeCount = await prisma.route.count({
         where: { groupId },
      });

      if (routeCount > 0) {
         return {
            ok: false as const,
            error: `Cannot delete route group with ${routeCount} route(s)`,
         };
      }

      await prisma.routeGroup.delete({
         where: { id: groupId },
      });

      return { ok: true as const };
   });
