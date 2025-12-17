"use server";

import { actionClient } from "@/lib/safe-action/clients";
import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendOtpMail } from "@/lib/mail";
import { forgotRequestSchema } from "@/lib/validations/auth";

export const sendResetOtp = actionClient
  .schema(forgotRequestSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const otp = generateOtp(6);
      const codeHash = await hashOtp(otp);
      const ttlMin = Number(process.env.RESET_TOKEN_TTL_MIN ?? 15);
      const expiresAt = new Date(Date.now() + ttlMin * 60_000);

      await prisma.passwordResetOtp.create({
        data: { email, codeHash, expiresAt },
      });

      await sendOtpMail(email, otp);
    }

    return { ok: true as const };
  });
