"use server";

import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { updateUserStatusSchema } from "@/lib/validations/users";
import { $Enums, Prisma } from "@prisma/client";
import { sendStatusUpdateEmail } from "@/lib/mail";

export const updateUserStatus = superAdminActionClient
  .schema(updateUserStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, status } = parsedInput;

    let targetAdmin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, level: true, email: true, name: true },
    });

    let targetUser = null;
    if (!targetAdmin) {
      targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true },
      });
    }

    if (!targetAdmin && !targetUser) {
      return { ok: false as const, message: "User/Admin not found." };
    }

    // do not allow modifying Developer admins
    if (targetAdmin?.level === $Enums.AdminLevel.DEVELOPER) {
      return {
        ok: false as const,
        message: "Developer admins are protected and cannot be modified.",
      };
    }

    const isSuspendedOrInactive = status === "SUSPENDED" || status === "INACTIVE";

    if (targetAdmin) {
      const data: Prisma.AdminUpdateInput = {
        status: status as $Enums.AccountStatus,
        suspendedAt: status === "SUSPENDED" ? new Date() : null,
      };
      
      if (isSuspendedOrInactive) {
        data.sessionVersion = { increment: 1 };
      }

      const admin = await prisma.admin.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, level: true, status: true, suspendedAt: true },
      });
      
      if (admin.email && admin.name) {
         sendStatusUpdateEmail(admin.email, admin.name, status).catch(console.error);
      }
      return { ok: true as const, user: admin };
    } else if (targetUser) {
      const data: Prisma.UserUpdateInput = {
        status: status as $Enums.AccountStatus,
        suspendedAt: status === "SUSPENDED" ? new Date() : null,
      };
      
      if (isSuspendedOrInactive) {
        data.sessionVersion = { increment: 1 };
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, status: true, suspendedAt: true },
      });
      
      if (user.email && user.name) {
         sendStatusUpdateEmail(user.email, user.name, status).catch(console.error);
      }
      return { ok: true as const, user };
    }

    return { ok: false as const, message: "Failed to update." };
  });
