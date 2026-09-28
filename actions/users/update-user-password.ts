"use server";

import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { updateUserPasswordSchema } from "@/lib/validations/users";
import { $Enums } from "@prisma/client";

export const updateUserPassword = superAdminActionClient
  .schema(updateUserPasswordSchema)
  .action(async ({ parsedInput }) => {
    const { id, password } = parsedInput;

    // Guard: block modifying Developer accounts
    const target = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, level: true },
    });
    if (!target) {
      return { ok: false as const, message: "Admin not found." };
    }
    if (target.level === $Enums.AdminLevel.DEVELOPER) {
      return {
        ok: false as const,
        message: "Developer admins are protected and their password cannot be changed.",
      };
    }

    const pwd = await hashPassword(password);

    await prisma.admin.update({
      where: { id },
      data: { password: pwd },
      select: { id: true },
    });

    return { ok: true as const };
  });
