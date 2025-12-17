"use server";

import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { updateUserStatusSchema } from "@/lib/validations/users";
import { $Enums, Prisma } from "@prisma/client";

export const updateUserStatus = superAdminActionClient
  .schema(updateUserStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, status } = parsedInput;

    //Fetch target first
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, name: true },
    });

    if (!target) {
      return { ok: false as const, message: "User not found." };
    }

    //   do not allow modifying Developer users
    if (target.role === $Enums.Role.DEVELOPER) {
      return {
        ok: false as const,
        message: "Developer users are protected and cannot be modified.",
      };
    }



    const data: Prisma.UserUpdateInput =
      status === "SUSPENDED"
        ? { status: status as $Enums.AccountStatus, suspendedAt: new Date() }
        : { status: status as $Enums.AccountStatus, suspendedAt: null };

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        suspendedAt: true,
      },
    });

    return { ok: true as const, user };
  });
