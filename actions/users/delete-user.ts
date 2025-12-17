"use server";

import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { deleteUserSchema } from "@/lib/validations/users";
import { $Enums } from "@prisma/client";

export const deleteUser = superAdminActionClient
  .schema(deleteUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;

    // Fetch target first
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, name: true },
    });

    if (!target) {
      return { ok: false as const, message: "User not found." };
    }

    //  do not allow deleting Developer users
    if (target.role === $Enums.Role.DEVELOPER) {
      return {
        ok: false as const,
        message: "Developer users are protected and cannot be deleted.",
      };
    }


    await prisma.user.delete({ where: { id } });
    return { ok: true as const };
  });
