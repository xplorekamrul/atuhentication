"use server";

import { serializeBigInt, toBigIntOrNull } from "@/lib/bigint-utils";
import { invalidateAdminPermissionsCache } from "@/lib/permissions/permissions";
import { getCachedRolesList } from "@/lib/permissions/rbac-cache";
import { prisma } from "@/lib/prisma";
import { developerActionClient } from "@/lib/safe-action/clients";
import {
   roleCreateSchema,
   roleDeleteSchema,
   roleListSchema,
   roleUpdateSchema,
} from "@/lib/validations/rbac";

export const listRoles = developerActionClient
   .inputSchema(roleListSchema)
   .action(async ({ parsedInput }) => {
      const { page, pageSize, q } = parsedInput;
      return getCachedRolesList(page, pageSize, q ?? "");
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

      await invalidateAdminPermissionsCache();

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

      await invalidateAdminPermissionsCache();

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

      // Check if role has admins assigned
      const adminCount = await prisma.adminRole.count({
         where: { roleId },
      });

      if (adminCount > 0) {
         return {
            ok: false as const,
            error: `Cannot delete role with ${adminCount} admin(s) assigned`,
         };
      }

      await prisma.role.delete({
         where: { id: roleId },
      });

      await invalidateAdminPermissionsCache();

      return { ok: true as const };
   });
