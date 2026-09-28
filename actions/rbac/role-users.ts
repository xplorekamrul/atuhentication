"use server";

import { serializeBigInt, toBigIntOrNull } from "@/lib/bigint-utils";
import { prisma } from "@/lib/prisma";
import { developerActionClient } from "@/lib/safe-action/clients";
import { z } from "zod";

const listRoleUsersSchema = z.object({
   roleId: z.string().or(z.number()),
   page: z.number().int().positive().default(1),
   pageSize: z.number().int().positive().default(10),
});

const assignUserToRoleSchema = z.object({
   adminId: z.string().or(z.number()), 
   roleId: z.string().or(z.number()),
});

const removeUserFromRoleSchema = z.object({
   adminId: z.string().or(z.number()),
   roleId: z.string().or(z.number()),
});

const assignMultipleRolesToUserSchema = z.object({
   adminId: z.string().or(z.number()),
   roleIds: z.array(z.string().or(z.number())).min(1, "At least one role is required"),
});

export const listRoleUsers = developerActionClient
   .inputSchema(listRoleUsersSchema)
   .action(async ({ parsedInput }) => {
      const { roleId, page, pageSize } = parsedInput;
      const roleIdBigInt = toBigIntOrNull(roleId);

      if (!roleIdBigInt) {
         return { ok: false as const, error: "Invalid role ID" };
      }

      // Check if role exists
      const role = await prisma.role.findUnique({
         where: { id: roleIdBigInt },
      });

      if (!role) {
         return { ok: false as const, error: "Role not found" };
      }

      const [items, total] = await Promise.all([
         prisma.admin.findMany({
            where: {
               adminRoles: {
                  some: { roleId: roleIdBigInt },
               },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
               id: true,
               name: true,
               email: true,
               username: true,
               level: true,
               status: true,
               createdAt: true,
            },
         }),
         prisma.admin.count({
            where: {
               adminRoles: {
                  some: { roleId: roleIdBigInt },
               },
            },
         }),
      ]);

      return {
         ok: true as const,
         items: serializeBigInt(items),
         total,
         page,
         pageSize,
      };
   });

export const assignUserToRole = developerActionClient
   .inputSchema(assignUserToRoleSchema)
   .action(async ({ parsedInput }) => {
      const { adminId, roleId } = parsedInput;
      const adminIdBigInt = toBigIntOrNull(adminId);
      const roleIdBigInt = toBigIntOrNull(roleId);

      if (!adminIdBigInt || !roleIdBigInt) {
         return { ok: false as const, error: "Invalid admin or role ID" };
      }

      // Check if admin exists
      const admin = await prisma.admin.findUnique({
         where: { id: adminIdBigInt },
      });

      if (!admin) {
         return { ok: false as const, error: "Admin not found" };
      }

      // Check if role exists
      const role = await prisma.role.findUnique({
         where: { id: roleIdBigInt },
      });

      if (!role) {
         return { ok: false as const, error: "Role not found" };
      }

      // Check if admin already has this role
      const existing = await prisma.adminRole.findUnique({
         where: {
            adminId_roleId: {
               adminId: adminIdBigInt,
               roleId: roleIdBigInt,
            },
         },
      });

      if (existing) {
         return { ok: false as const, error: "Admin already has this role" };
      }

      // Create admin-role assignment
      await prisma.adminRole.create({
         data: {
            adminId: adminIdBigInt,
            roleId: roleIdBigInt,
         },
      });

      return { ok: true as const };
   });

export const removeUserFromRole = developerActionClient
   .inputSchema(removeUserFromRoleSchema)
   .action(async ({ parsedInput }) => {
      const { adminId, roleId } = parsedInput;
      const adminIdBigInt = toBigIntOrNull(adminId);
      const roleIdBigInt = toBigIntOrNull(roleId);

      if (!adminIdBigInt || !roleIdBigInt) {
         return { ok: false as const, error: "Invalid admin or role ID" };
      }

      try {
         // Check if admin exists
         const admin = await prisma.admin.findUnique({
            where: { id: adminIdBigInt },
            select: { id: true, email: true },
         });

         if (!admin) {
            return { ok: false as const, error: "Admin not found" };
         }

         // Delete the admin-role assignment
         await prisma.adminRole.deleteMany({
            where: {
               adminId: adminIdBigInt,
               roleId: roleIdBigInt,
            },
         });

         console.log(`Admin ${admin.email} removed from role`);

         return { ok: true as const };
      } catch (error) {
         console.error("Error removing admin from role:", error);
         return { ok: false as const, error: "Failed to remove admin from role" };
      }
   });

export const assignMultipleRolesToUser = developerActionClient
   .inputSchema(assignMultipleRolesToUserSchema)
   .action(async ({ parsedInput }) => {
      const { adminId, roleIds } = parsedInput;
      const adminIdBigInt = toBigIntOrNull(adminId);

      if (!adminIdBigInt) {
         return { ok: false as const, error: "Invalid admin ID" };
      }

      // Check if admin exists
      const admin = await prisma.admin.findUnique({
         where: { id: adminIdBigInt },
      });

      if (!admin) {
         return { ok: false as const, error: "Admin not found" };
      }

      // Convert and validate all role IDs
      const roleIdsBigInt = roleIds.map((id) => toBigIntOrNull(id)).filter((id) => id !== null) as bigint[];

      if (roleIdsBigInt.length === 0) {
         return { ok: false as const, error: "Invalid role IDs" };
      }

      // Check if all roles exist
      const roles = await prisma.role.findMany({
         where: { id: { in: roleIdsBigInt } },
      });

      if (roles.length !== roleIdsBigInt.length) {
         return { ok: false as const, error: "One or more roles not found" };
      }

      // Delete existing roles for this admin
      await prisma.adminRole.deleteMany({
         where: { adminId: adminIdBigInt },
      });

      // Create new role assignments
      await prisma.adminRole.createMany({
         data: roleIdsBigInt.map((roleId) => ({
            adminId: adminIdBigInt,
            roleId,
         })),
      });

      return { ok: true as const };
   });
