"use server";

import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { createUserSchema } from "@/lib/validations/users";

export const createUser = superAdminActionClient
  .schema(createUserSchema)
  .action(async ({ parsedInput }) => {
    const { name, username, email, role, password } = parsedInput;

    const exists = await prisma.admin.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (exists) {
      if (exists.email === email) return { ok: false as const, message: "Email already exists." };
      if (exists.username === username) return { ok: false as const, message: "Username already exists." };
    }

    const pwd = await hashPassword(password);
    const admin = await prisma.admin.create({
      data: { name, username, email, level: role, password: pwd },
      select: { id: true, name: true, username: true, email: true, level: true, status: true },
    });

    return { ok: true as const, user: admin };
  });
