"use server";

import { hashPassword } from "@/lib/hash";
import { sendWelcomeEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { registerSchema } from "@/lib/validations/auth";
import { UserType } from "@prisma/client";

export const register = actionClient
  .schema(registerSchema)
  .action(async ({ parsedInput }) => {
    const { name, email, password, username } = parsedInput;
    const normalizedEmail = email.toLowerCase().trim();

    // Register as User only
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
  );
