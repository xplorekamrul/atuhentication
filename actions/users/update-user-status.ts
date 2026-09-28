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
    const target = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, level: true, email: true, name: true },
    });

    if (!target) {
      return { ok: false as const, message: "Admin not found." };
    }

    //   do not allow modifying Developer admins
    if (target.level === $Enums.AdminLevel.DEVELOPER) {
      return {
        ok: false as const,
        message: "Developer admins are protected and cannot be modified.",
      };
    }



    const data: Prisma.AdminUpdateInput =
      status === "SUSPENDED"
        ? { status: status as $Enums.AccountStatus, suspendedAt: new Date() }
        : { status: status as $Enums.AccountStatus, suspendedAt: null };

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
  });
