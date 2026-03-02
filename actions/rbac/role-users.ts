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
   userId: z.string().or(z.number()), 
   roleId: z.string().or(z.number()),
});

const removeUserFromRoleSchema = z.object({
   userId: z.string().or(z.number()),
   roleId: z.string().or(z.number()),
});

const assignMultipleRolesToUserSchema = z.object({
   userId: z.string().or(z.number()),
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
         prisma.user.findMany({
            where: {
               userRoles: {
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
               userlevel: true,
               status: true,
               createdAt: true,
            },
         }),
         prisma.user.count({
            where: {
               userRoles: {
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
      const { userId, roleId } = parsedInput;
      const userIdBigInt = toBigIntOrNull(userId);
      const roleIdBigInt = toBigIntOrNull(roleId);

      if (!userIdBigInt || !roleIdBigInt) {
         return { ok: false as const, error: "Invalid user or role ID" };
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
         where: { id: userIdBigInt },
      });

      if (!user) {
         return { ok: false as const, error: "User not found" };
      }

      // Check if role exists
      const role = await prisma.role.findUnique({
         where: { id: roleIdBigInt },
      });

      if (!role) {
         return { ok: false as const, error: "Role not found" };
      }

      // Check if user already has this role
      const existing = await prisma.userRole.findUnique({
         where: {
            userId_roleId: {
               userId: userIdBigInt,
               roleId: roleIdBigInt,
            },
         },
      });

      if (existing) {
         return { ok: false as const, error: "User already has this role" };
      }

      // Create user-role assignment
      await prisma.userRole.create({
         data: {
            userId: userIdBigInt,
            roleId: roleIdBigInt,
         },
      });

      return { ok: true as const };
   });

export const removeUserFromRole = developerActionClient
   .inputSchema(removeUserFromRoleSchema)
   .action(async ({ parsedInput }) => {
      const { userId, roleId } = parsedInput;
      const userIdBigInt = toBigIntOrNull(userId);
      const roleIdBigInt = toBigIntOrNull(roleId);

      if (!userIdBigInt || !roleIdBigInt) {
         return { ok: false as const, error: "Invalid user or role ID" };
      }

      try {
         // Check if user exists
         const user = await prisma.user.findUnique({
            where: { id: userIdBigInt },
            select: { id: true, email: true },
         });

         if (!user) {
            return { ok: false as const, error: "User not found" };
         }

         // Delete the user-role assignment
         await prisma.userRole.deleteMany({
            where: {
               userId: userIdBigInt,
               roleId: roleIdBigInt,
            },
         });

         console.log(`User ${user.email} removed from role`);

         return { ok: true as const };
      } catch (error) {
         console.error("Error removing user from role:", error);
         return { ok: false as const, error: "Failed to remove user from role" };
      }
   });

export const assignMultipleRolesToUser = developerActionClient
   .inputSchema(assignMultipleRolesToUserSchema)
   .action(async ({ parsedInput }) => {
      const { userId, roleIds } = parsedInput;
      const userIdBigInt = toBigIntOrNull(userId);

      if (!userIdBigInt) {
         return { ok: false as const, error: "Invalid user ID" };
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
         where: { id: userIdBigInt },
      });

      if (!user) {
         return { ok: false as const, error: "User not found" };
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

      // Delete existing roles for this user
      await prisma.userRole.deleteMany({
         where: { userId: userIdBigInt },
      });

      // Create new role assignments
      await prisma.userRole.createMany({
         data: roleIdsBigInt.map((roleId) => ({
            userId: userIdBigInt,
            roleId,
         })),
      });

      return { ok: true as const };
   });
