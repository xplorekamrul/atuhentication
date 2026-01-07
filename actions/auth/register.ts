"use server";

import { hashPassword } from "@/lib/hash";
import { sendWelcomeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { registerSchema } from "@/lib/validations/auth";
import { Role } from "@prisma/client";

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

    let role: Role = Role.ADMIN;
    if (email === (process.env.SUPERADMIN_EMAIL ?? "").toLowerCase().trim()) {
      role = Role.SUPER_ADMIN;
    } else if (email === (process.env.DEVELOPER_EMAIL ?? "").toLowerCase().trim()) {
      role = Role.DEVELOPER;
    }

    const pwd = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, username, password: pwd, role },
      select: { id: true, email: true, role: true, name: true, username: true },
    });

    // Send welcome email (fire and forget to not block response)
    void sendWelcomeEmail(user.email, user.name ?? "User");

    return { ok: true as const, user };
  });
