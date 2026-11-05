"use server";

import { actionClient } from "@/lib/safe-action/clients";
import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendOtpMail } from "@/lib/mail";
import { forgotRequestSchema } from "@/lib/validations/auth";
import { headers } from "next/headers";
import { getClientIp, incrementRateLimit } from "@/lib/rate-limit";

export const sendResetOtp = actionClient
  .schema(forgotRequestSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const headerList = await headers();
    const ip = getClientIp(headerList);

    // 1. Rate limit by IP: max 5 requests per 10 minutes to prevent spam
    const ipLimit = incrementRateLimit(`otp:send:ip:${ip}`, 5, 10 * 60);
    if (!ipLimit.success) {
      return {
        ok: false as const,
        message: `Too many password reset requests from this network. Please wait ${Math.ceil(ipLimit.resetInSeconds / 60)} minute(s).`,
      };
    }

    // 2. Rate limit by Email: max 3 requests per 10 minutes to prevent email flooding
    const emailLimit = incrementRateLimit(`otp:send:email:${email}`, 3, 10 * 60);
    if (!emailLimit.success) {
      return {
        ok: false as const,
        message: `Too many reset requests for this email. Please check your inbox or wait ${Math.ceil(emailLimit.resetInSeconds / 60)} minute(s).`,
      };
    }

    // Check user first, then admin
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const admin = !user ? await prisma.admin.findUnique({ where: { email }, select: { id: true } }) : null;

    if (user || admin) {
      // Invalidate any previously unconsumed OTPs for this email so only the latest is active
      await prisma.passwordResetOtp.updateMany({
        where: { email, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      const otp = generateOtp(6);
      const codeHash = await hashOtp(otp);
      const ttlMin = Number(process.env.RESET_TOKEN_TTL_MIN ?? 15);
      const expiresAt = new Date(Date.now() + ttlMin * 60_000);

      await prisma.passwordResetOtp.create({
        data: { email, codeHash, expiresAt },
      });

      // Safely send mail with error handling
      try {
        await sendOtpMail(email, otp);
      } catch (mailError) {
        console.error("Failed to send OTP email:", mailError);
        return {
          ok: false as const,
          message: "Failed to dispatch reset code email. Please try again later.",
        };
      }
    }

    // Return generic success to avoid email enumeration
    return { ok: true as const };
  });
