"use server";

import { hashPassword } from "@/lib/hash";
import { sendWelcomeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { registerSchema } from "@/lib/validations/auth";
import { AdminLevel, UserType } from "@prisma/client";

export const register = actionClient
  .schema(registerSchema)
  .action(async ({ parsedInput }) => {
    const { name, email, password, username } = parsedInput;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email matches admin emails
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL ?? "").toLowerCase().trim();
    const developerEmail = (process.env.DEVELOPER_EMAIL ?? "").toLowerCase().trim();

    const isAdmin = normalizedEmail === superAdminEmail || normalizedEmail === developerEmail;

    if (isAdmin) {
      // Register as Admin
      const emailExists = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
      if (emailExists) {
        return { ok: false as const, message: "Email already registered" };
      }

      const usernameExists = await prisma.admin.findUnique({ where: { username } });
      if (usernameExists) {
        return { ok: false as const, message: "Username already taken" };
      }

      // Determine admin level based on email
      let level: AdminLevel = AdminLevel.ADMIN;
      if (normalizedEmail === superAdminEmail) {
        level = AdminLevel.SUPER_ADMIN;
      } else if (normalizedEmail === developerEmail) {
        level = AdminLevel.DEVELOPER;
      }

      const pwd = await hashPassword(password);

      const admin = await prisma.admin.create({
        data: {
          name,
          email: normalizedEmail,
          username,
          password: pwd,
          level,
          userType: UserType.ADMIN
        },
        select: { id: true, email: true, level: true, name: true, username: true },
      });

      // Send welcome email (fire and forget to not block response)
      if (admin.email) {
        void sendWelcomeEmail(admin.email, admin.name ?? "Admin");
      }

      return { ok: true as const, user: admin };
    } else {
      // Register as User
      const emailExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (emailExists) {
        return { ok: false as const, message: "Email already registered" };
      }

      const usernameExists = await prisma.user.findUnique({ where: { username } });
      if (usernameExists) {
        return { ok: false as const, message: "Username already taken" };
      }

      const pwd = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          username,
          password: pwd,
          userType: UserType.USER
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
