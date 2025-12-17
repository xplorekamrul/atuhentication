"use server";

import { actionClient } from "@/lib/safe-action/clients";
import { forgotVerifySchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { signResetToken } from "@/lib/reset-token";
import { cookies } from "next/headers";

const MAX_ATTEMPTS = 5;

export const verifyResetOtp = actionClient
  .schema(forgotVerifySchema)
  .action(async ({ parsedInput }) => {
    const { email, code } = parsedInput;

    const record = await prisma.passwordResetOtp.findFirst({
      where: {
        email,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: MAX_ATTEMPTS },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return { ok: false as const, message: "Invalid or expired code." };

    const valid = await verifyOtp(code, record.codeHash);
    if (!valid) {
      await prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return { ok: false as const, message: "Incorrect code." };
    }

    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    const token = signResetToken(email);
    const cookieStore = await cookies();
    cookieStore.set("reset_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Number(process.env.RESET_TOKEN_TTL_MIN ?? 15) * 60,
    });

    return { ok: true as const };
  });
