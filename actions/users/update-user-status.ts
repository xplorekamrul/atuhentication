"use server";

import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { updateUserStatusSchema } from "@/lib/validations/users";
import { $Enums, Prisma } from "@prisma/client";

export const updateUserStatus = superAdminActionClient
  .schema(updateUserStatusSchema)
  .action(async ({ parsedInput }) => {
    const { id, userType, status } = parsedInput;
    const isDeactivated = status === "SUSPENDED" || status === "INACTIVE";

    // 1. If explicitly USER
    if (userType === "USER") {
      const userBigIntId = BigInt(id);
      const targetUser = await prisma.user.findUnique({
        where: { id: userBigIntId },
        select: { id: true, email: true, name: true },
      });

      if (!targetUser) return { ok: false as const, message: "User not found." };

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
        where: { id: userBigIntId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          suspendedAt: true,
        },
      });

      return { ok: true as const, user: { ...user, id: user.id.toString() } };
    }

    // 2. If explicitly ADMIN
    if (userType === "ADMIN") {
      const targetAdmin = await prisma.admin.findUnique({
        where: { id },
        select: { id: true, level: true, email: true, name: true },
      });

      if (!targetAdmin) return { ok: false as const, message: "Admin not found." };

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

    // 3. Fallback if userType not provided: check Admin first, then User
    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, level: true, email: true, name: true },
    });

    if (targetAdmin) {
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

    if (/^\d+$/.test(id)) {
      const userBigIntId = BigInt(id);
      const targetUser = await prisma.user.findUnique({
        where: { id: userBigIntId },
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
          where: { id: userBigIntId },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            suspendedAt: true,
          },
        });

        return { ok: true as const, user: { ...user, id: user.id.toString() } };
      }
    }

    return { ok: false as const, message: "Account not found." };
  });
