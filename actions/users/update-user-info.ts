"use server";

import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { updateUserInfoSchema } from "@/lib/validations/users";
import { $Enums } from "@prisma/client";

export const updateUserInfo = superAdminActionClient
  .schema(updateUserInfoSchema)
  .action(async ({ parsedInput }) => {
    const { id, name, email } = parsedInput;

    // Guard: block modifying Developer accounts
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!target) {
      return { ok: false as const, message: "User not found." };
    }
    if (target.role === $Enums.Role.DEVELOPER) {
      return {
        ok: false as const,
        message: "Developer users are protected and cannot be edited.",
      };
    }

    // Uniqueness check for email
    const emailUsed = await prisma.user.findFirst({
      where: { email, NOT: { id } },
      select: { id: true },
    });
    if (emailUsed) {
      return { ok: false as const, message: "Email already in use by another account." };
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, email },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return { ok: true as const, user };
  });
