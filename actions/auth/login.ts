"use server";

import { verifyPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { loginSchema } from "@/lib/validations/auth";

export const login = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;

    // Try user only
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, name: true },
    });

    if (!user) {
      return { ok: false as const, message: "No account found with this email." };
    }

    const match = await verifyPassword(password, user.password);
    if (!match) {
      return { ok: false as const, message: "Incorrect password." };
    }

    return { ok: true as const, user: { id: user.id, email: user.email, name: user.name } };
  });
