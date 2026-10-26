"use server";

import { actionClient } from "@/lib/safe-action/clients";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import { cookies } from "next/headers";
import { verifyResetToken } from "@/lib/reset-token";

export const resetPassword = actionClient
  .schema(resetPasswordSchema)
  .action(async ({ parsedInput }) => {
    const { password } = parsedInput;

    const cookieStore = await cookies();
    const token = cookieStore.get("reset_token")?.value;
    if (!token) return { ok: false as const, message: "Reset session not found." };

    const payload = verifyResetToken(token);
    if (!payload) return { ok: false as const, message: "Reset session expired or invalid." };

    const email = payload.email.toLowerCase().trim();
    const pwd = await hashPassword(password);

    // Try finding regular user
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: pwd,
          sessionVersion: { increment: 1 },
        },
      });

      cookieStore.delete("reset_token");
      return { ok: true as const };
    }

    // Try finding admin
    const admin = await prisma.admin.findUnique({ where: { email }, select: { id: true } });
    if (admin) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          password: pwd,
          sessionVersion: { increment: 1 },
        },
      });

      cookieStore.delete("reset_token");
      return { ok: true as const };
    }

    return { ok: false as const, message: "Account not found." };
  });
