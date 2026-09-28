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
    const target = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, level: true, email: true, name: true },
    });

    if (!target) {
      return { ok: false as const, message: "Admin not found." };
    }

    //  do not allow deleting Developer admins
    if (target.level === $Enums.AdminLevel.DEVELOPER) {
      return {
        ok: false as const,
        message: "Developer admins are protected and cannot be deleted.",
      };
    }


    await prisma.admin.delete({ where: { id } });
    return { ok: true as const };
  });
