"use server";

import { hashPassword } from "@/lib/hash";
import { sendWelcomeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { registerSchema } from "@/lib/validations/auth";
import { AdminLevel, UserType } from "@prisma/client";
import { headers } from "next/headers";
import { getClientIp, incrementRateLimit } from "@/lib/rate-limit";

const ACCOUNT_EXISTS_MESSAGE = "An account with this email or username already exists. Please sign in or use different details.";

export const register = actionClient
  .schema(registerSchema)
  .action(async ({ parsedInput }) => {
    const { name, email, password, username } = parsedInput;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. IP Rate Limiting: max 5 registrations per hour per IP to prevent spam bot accounts
    const headerList = await headers();
    const ip = getClientIp(headerList);
    const regLimit = incrementRateLimit(`reg:ip:${ip}`, 5, 60 * 60);
    if (!regLimit.success) {
      return {
        ok: false as const,
        message: `Too many registration attempts from this network. Please try again after ${Math.ceil(regLimit.resetInSeconds / 60)} minute(s).`,
      };
    }

    // 2. Cross-table collision check (guarantee email and username are unique across BOTH Admin and User tables)
    const [adminWithEmail, userWithEmail, adminWithUsername, userWithUsername] = await Promise.all([
      prisma.admin.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
      prisma.admin.findUnique({ where: { username }, select: { id: true } }),
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
    ]);

    if (adminWithEmail || userWithEmail || adminWithUsername || userWithUsername) {
      return { ok: false as const, message: ACCOUNT_EXISTS_MESSAGE };
    }

    // Check if email matches admin emails
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL ?? "").toLowerCase().trim();
    const developerEmail = (process.env.DEVELOPER_EMAIL ?? "").toLowerCase().trim();

    const isAdmin = normalizedEmail === superAdminEmail || normalizedEmail === developerEmail;

    const pwd = await hashPassword(password);

    if (isAdmin) {
      // Determine admin level based on email
      let level: AdminLevel = AdminLevel.ADMIN;
      if (normalizedEmail === superAdminEmail) {
        level = AdminLevel.SUPER_ADMIN;
      } else if (normalizedEmail === developerEmail) {
        level = AdminLevel.DEVELOPER;
      }

      const admin = await prisma.admin.create({
        data: {
          name,
          email: normalizedEmail,
          username,
          password: pwd,
          level,
          userType: UserType.ADMIN,
        },
        select: { id: true, email: true, level: true, name: true, username: true },
      });

      // Send welcome email (fire and forget to not block response)
      if (admin.email) {
        void sendWelcomeEmail(admin.email, admin.name ?? "Admin");
      }

      return { ok: true as const, user: admin };
    } else {
      const user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          username,
          password: pwd,
          userType: UserType.USER,
        },
        select: { id: true, email: true, name: true, username: true },
      });

      // Send welcome email (fire and forget to not block response)
      if (user.email) {
        void sendWelcomeEmail(user.email, user.name ?? "User");
      }

      return { ok: true as const, user };
    }
  });
