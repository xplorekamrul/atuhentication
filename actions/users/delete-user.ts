"use server";

import { invalidateAdminPermissionsCache } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { deleteUserSchema } from "@/lib/validations/users";
import { resetExponentialLockout } from "@/lib/rate-limit";
import { $Enums } from "@prisma/client";

export const deleteUser = superAdminActionClient
  .schema(deleteUserSchema)
  .action(async ({ parsedInput }) => {
    const { id, userType } = parsedInput;

    // 1. If explicitly USER
    if (userType === "USER") {
      const userBigIntId = BigInt(id);
      const targetUser = await prisma.user.findUnique({
        where: { id: userBigIntId },
        select: { id: true, email: true },
      });

      if (!targetUser) return { ok: false as const, message: "User not found." };

      await prisma.user.delete({ where: { id: userBigIntId } });

      if (targetUser.email) {
        resetExponentialLockout(`exp:account:${targetUser.email.toLowerCase().trim()}`);
      }

      return { ok: true as const };
    }

    // 2. If explicitly ADMIN
    if (userType === "ADMIN") {
      const targetAdmin = await prisma.admin.findUnique({
        where: { id },
        select: { id: true, level: true, email: true },
      });

      if (!targetAdmin) return { ok: false as const, message: "Admin not found." };

      if (targetAdmin.level === $Enums.AdminLevel.DEVELOPER) {
        return {
          ok: false as const,
          message: "Developer admins are protected and cannot be deleted.",
        };
      }

      await prisma.admin.delete({ where: { id } });

      if (targetAdmin.email) {
        resetExponentialLockout(`exp:account:${targetAdmin.email.toLowerCase().trim()}`);
      }
      await invalidateAdminPermissionsCache(id);

      return { ok: true as const };
    }

    // 3. Fallback: check Admin first, then User
    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, level: true, email: true },
    });

    if (targetAdmin) {
      if (targetAdmin.level === $Enums.AdminLevel.DEVELOPER) {
        return {
          ok: false as const,
          message: "Developer admins are protected and cannot be deleted.",
        };
      }

      await prisma.admin.delete({ where: { id } });

      if (targetAdmin.email) {
        resetExponentialLockout(`exp:account:${targetAdmin.email.toLowerCase().trim()}`);
      }
      await invalidateAdminPermissionsCache(id);

      return { ok: true as const };
    }

    if (/^\d+$/.test(id)) {
      const userBigIntId = BigInt(id);
      const targetUser = await prisma.user.findUnique({
        where: { id: userBigIntId },
        select: { id: true, email: true },
      });

      if (targetUser) {
        await prisma.user.delete({ where: { id: userBigIntId } });

        if (targetUser.email) {
          resetExponentialLockout(`exp:account:${targetUser.email.toLowerCase().trim()}`);
        }

        return { ok: true as const };
      }
    }

    return { ok: false as const, message: "Account not found." };
  });
