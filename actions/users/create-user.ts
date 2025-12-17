"use server";

import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { createUserSchema } from "@/lib/validations/users";
import { hashPassword } from "@/lib/hash";

export const createUser = superAdminActionClient
  .schema(createUserSchema)
  .action(async ({ parsedInput }) => {
    const { name, email, role, password } = parsedInput;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return { ok: false as const, message: "Email already exists." };
    }

    const pwd = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, role, password: pwd },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return { ok: true as const, user };
  });
