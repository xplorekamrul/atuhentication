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
    const { id, password } = parsedInput;
    const pwd = await hashPassword(password);

    // 1. Try finding target in Admin table
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

      // Clear any lockout on this account
      if (targetAdmin.email) {
        resetExponentialLockout(`exp:account:${targetAdmin.email.toLowerCase().trim()}`);
      }

      return { ok: true as const };
    }

    // 2. Try finding target in User table
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (targetUser) {
      await prisma.user.update({
        where: { id },
        data: { password: pwd, sessionVersion: { increment: 1 } },
        select: { id: true },
      });

      // Clear any lockout on this account
      if (targetUser.email) {
        resetExponentialLockout(`exp:account:${targetUser.email.toLowerCase().trim()}`);
      }

      return { ok: true as const };
    }

    return { ok: false as const, message: "Account not found." };
  });
