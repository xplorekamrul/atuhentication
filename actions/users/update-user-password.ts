"use server";

import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { updateUserPasswordSchema } from "@/lib/validations/users";
import { resetExponentialLockout } from "@/lib/rate-limit";
import { $Enums } from "@prisma/client";

export const updateUserPassword = superAdminActionClient
  .schema(updateUserPasswordSchema)
  .action(async ({ parsedInput }) => {
    const { id, userType, password } = parsedInput;
    const pwd = await hashPassword(password);

    // 1. If explicitly USER
    if (userType === "USER") {
      const userBigIntId = BigInt(id);
      const targetUser = await prisma.user.findUnique({
        where: { id: userBigIntId },
        select: { id: true, email: true },
      });

      if (!targetUser) return { ok: false as const, message: "User not found." };

      await prisma.user.update({
        where: { id: userBigIntId },
        data: { password: pwd, sessionVersion: { increment: 1 } },
        select: { id: true },
      });

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
          message: "Developer admins are protected and their password cannot be changed.",
        };
      }

      await prisma.admin.update({
        where: { id },
        data: { password: pwd, sessionVersion: { increment: 1 } },
        select: { id: true },
      });

      if (targetAdmin.email) {
        resetExponentialLockout(`exp:account:${targetAdmin.email.toLowerCase().trim()}`);
      }

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
          message: "Developer admins are protected and their password cannot be changed.",
        };
      }

      await prisma.admin.update({
        where: { id },
        data: { password: pwd, sessionVersion: { increment: 1 } },
        select: { id: true },
      });

      if (targetAdmin.email) {
        resetExponentialLockout(`exp:account:${targetAdmin.email.toLowerCase().trim()}`);
      }

      return { ok: true as const };
    }

    if (/^\d+$/.test(id)) {
      const userBigIntId = BigInt(id);
      const targetUser = await prisma.user.findUnique({
        where: { id: userBigIntId },
        select: { id: true, email: true },
      });

      if (targetUser) {
        await prisma.user.update({
          where: { id: userBigIntId },
          data: { password: pwd, sessionVersion: { increment: 1 } },
          select: { id: true },
        });

        if (targetUser.email) {
          resetExponentialLockout(`exp:account:${targetUser.email.toLowerCase().trim()}`);
        }

        return { ok: true as const };
      }
    }

    return { ok: false as const, message: "Account not found." };
  });
