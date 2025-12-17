"use server";

import { actionClient } from "@/lib/safe-action/clients";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/hash";
import { loginSchema } from "@/lib/validations/auth";

export const login = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, role: true, name: true },
    });

    if (!user) {
      // Return a clean message (don’t throw to avoid generic serverError)
      return { ok: false as const, message: "No account found with this email." };
    }

    const match = await verifyPassword(password, user.password);
    if (!match) {
      return { ok: false as const, message: "Incorrect password." };
    }

    // Auth session is still handled by NextAuth on the client (signIn).
    return { ok: true as const, user: { id: user.id, email: user.email, role: user.role, name: user.name } };
  });
