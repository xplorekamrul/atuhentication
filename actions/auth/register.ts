"use server";

import { hashPassword } from "@/lib/hash";
import { sendWelcomeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { registerSchema } from "@/lib/validations/auth";
import { userLevel } from "@prisma/client";

export const register = actionClient
  .schema(registerSchema)
  .action(async ({ parsedInput }) => {
    const { name, email, password, username } = parsedInput;

    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) {
      return { ok: false as const, message: "Email already registered" };
    }

    const usernameExists = await prisma.user.findUnique({ where: { username } });
    if (usernameExists) {
      return { ok: false as const, message: "Username already taken" };
    }

    let role: userLevel = userLevel.ADMIN;
    if (email === (process.env.SUPERADMIN_EMAIL ?? "").toLowerCase().trim()) {
      role = userLevel.SUPER_ADMIN;
    } else if (email === (process.env.DEVELOPER_EMAIL ?? "").toLowerCase().trim()) {
      role = userLevel.DEVELOPER;
    }

    const pwd = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, username, password: pwd, userlevel: role },
      select: { id: true, email: true, userlevel: true, name: true, username: true },
    });

    // Send welcome email (fire and forget to not block response)
    if (user.email) {
      void sendWelcomeEmail(user.email, user.name ?? "User");
    }

    return { ok: true as const, user };
  });
