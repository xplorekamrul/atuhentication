"use server";

import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { updateUserStatusSchema } from "@/lib/validations/users";
import { $Enums, Prisma } from "@prisma/client";

export const updateUserStatus = superAdminActionClient
  .schema(updateUserStatusSchema)
  .action(async ({ parsedInput }) => {
    const { id, status } = parsedInput;

    const isDeactivated = status === "SUSPENDED" || status === "INACTIVE";

    // 1. Try finding target in Admin table
    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, level: true, email: true, name: true },
    });

    if (targetAdmin) {
      // Do not allow modifying Developer admins
      if (targetAdmin.level === $Enums.AdminLevel.DEVELOPER) {
        return {
          ok: false as const,
          message: "Developer admins are protected and cannot be modified.",
        };
      }

      const data: Prisma.AdminUpdateInput = isDeactivated
        ? {
            status: status as $Enums.AccountStatus,
            suspendedAt: status === "SUSPENDED" ? new Date() : null,
            sessionVersion: { increment: 1 },
          }
        : {
            status: status as $Enums.AccountStatus,
            suspendedAt: null,
          };

      const admin = await prisma.admin.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          level: true,
          status: true,
          suspendedAt: true,
        },
      });

      return { ok: true as const, user: admin };
    }

    // 2. Try finding target in User table
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (targetUser) {
      const data: Prisma.UserUpdateInput = isDeactivated
        ? {
            status: status as $Enums.AccountStatus,
            suspendedAt: status === "SUSPENDED" ? new Date() : null,
            sessionVersion: { increment: 1 },
          }
        : {
            status: status as $Enums.AccountStatus,
            suspendedAt: null,
          };

      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          suspendedAt: true,
        },
      });

      return { ok: true as const, user };
    }

    return { ok: false as const, message: "Account not found." };
  });
