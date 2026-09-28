"use server";

import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { updateUserPasswordSchema } from "@/lib/validations/users";
import { $Enums } from "@prisma/client";
import { sendPasswordChangedEmail } from "@/lib/mail";

export const updateUserPassword = superAdminActionClient
  .schema(updateUserPasswordSchema)
  .action(async ({ parsedInput }) => {
    const { id, password } = parsedInput;

    // Guard: block modifying Developer accounts
    let targetAdmin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, level: true, name: true, email: true },
    });

    let targetUser = null;
    if (!targetAdmin) {
       targetUser = await prisma.user.findUnique({
         where: { id },
         select: { id: true, name: true, email: true },
       });
    }

    if (!targetAdmin && !targetUser) {
      return { ok: false as const, message: "User/Admin not found." };
    }

    if (targetAdmin?.level === $Enums.AdminLevel.DEVELOPER) {
      return {
        ok: false as const,
        message: "Developer admins are protected and their password cannot be changed.",
      };
    }

    const pwd = await hashPassword(password);

    if (targetAdmin) {
       await prisma.admin.update({
         where: { id },
         data: { password: pwd, sessionVersion: { increment: 1 } },
         select: { id: true },
       });
       if (targetAdmin.email && targetAdmin.name) {
          sendPasswordChangedEmail(targetAdmin.email, targetAdmin.name).catch(console.error);
       }
       return { ok: true as const };
    } else if (targetUser) {
       await prisma.user.update({
         where: { id },
         data: { password: pwd, sessionVersion: { increment: 1 } },
         select: { id: true },
       });
       if (targetUser.email && targetUser.name) {
          sendPasswordChangedEmail(targetUser.email, targetUser.name).catch(console.error);
       }
       return { ok: true as const };
    }

    return { ok: false as const, message: "Failed to update." };
  });
