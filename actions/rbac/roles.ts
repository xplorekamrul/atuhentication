"use server";

import { serializeBigInt, toBigIntOrNull } from "@/lib/bigint-utils";
import { prisma } from "@/lib/prisma";
import { developerActionClient } from "@/lib/safe-action/clients";
import {
   roleCreateSchema,
   roleDeleteSchema,
   roleListSchema,
   roleUpdateSchema,
} from "@/lib/validations/rbac";
import { Prisma } from "@prisma/client";

export const listRoles = developerActionClient
   .inputSchema(roleListSchema)
   .action(async ({ parsedInput }) => {
      const { page, pageSize, q } = parsedInput;

      const where: Prisma.RoleWhereInput = q
         ? { name: { contains: q } }
         : {};

      const [items, total] = await Promise.all([
         prisma.role.findMany({
            where,
            orderBy: { name: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
               id: true,
               name: true,
               createdAt: true,
               _count: {
                  select: { userRoles: true, roleRouteGroups: true },
               },
            },
         }),
         prisma.role.count({ where }),
      ]);

      return {
         ok: true as const,
         items: serializeBigInt(items),
         total,
         page,
         pageSize,
      };
   });

export const createRole = developerActionClient
   .inputSchema(roleCreateSchema)
   .action(async ({ parsedInput }) => {
      const { name } = parsedInput;

      // Check if role already exists
      const existing = await prisma.role.findUnique({
         where: { name },
      });

      if (existing) {
         return { ok: false as const, error: "Role already exists" };
      }

      const role = await prisma.role.create({
         data: { name },
         select: { id: true, name: true, createdAt: true },
      });

      return { ok: true as const, data: serializeBigInt(role) };
   });

export const updateRole = developerActionClient
   .inputSchema(roleUpdateSchema)
   .action(async ({ parsedInput }) => {
      const { id, name } = parsedInput;
      const roleId = toBigIntOrNull(id);

      if (!roleId) {
         return { ok: false as const, error: "Invalid role ID" };
      }

      // Check if role exists
      const role = await prisma.role.findUnique({
         where: { id: roleId },
      });

      if (!role) {
         return { ok: false as const, error: "Role not found" };
      }

      // Check if new name is already taken by another role
      if (name !== role.name) {
         const existing = await prisma.role.findUnique({
            where: { name },
         });
         if (existing) {
            return { ok: false as const, error: "Role name already exists" };
         }
      }

      const updated = await prisma.role.update({
         where: { id: roleId },
         data: { name },
         select: { id: true, name: true, createdAt: true },
      });

      return { ok: true as const, data: serializeBigInt(updated) };
   });

export const deleteRole = developerActionClient
   .inputSchema(roleDeleteSchema)
   .action(async ({ parsedInput }) => {
      const { id } = parsedInput;
      const roleId = toBigIntOrNull(id);

      if (!roleId) {
         return { ok: false as const, error: "Invalid role ID" };
      }

      // Check if role has users assigned
      const userCount = await prisma.userRole.count({
         where: { roleId },
      });

      if (userCount > 0) {
         return {
            ok: false as const,
            error: `Cannot delete role with ${userCount} user(s) assigned`,
         };
      }

      await prisma.role.delete({
         where: { id: roleId },
      });

      return { ok: true as const };
   });
