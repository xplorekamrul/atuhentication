"use server";

import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { createNormalUserSchema } from "@/lib/validations/users";
import { UserType } from "@prisma/client";

export const createNormalUser = superAdminActionClient
  .schema(createNormalUserSchema)
  .action(async ({ parsedInput }) => {
    const { name, username, email, password } = parsedInput;
    const normalizedEmail = email.toLowerCase().trim();

    // Check uniqueness on User table
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
    ]);

    if (existingEmail) {
      return { ok: false as const, message: "Email already exists." };
    }
    if (existingUsername) {
      return { ok: false as const, message: "Username already exists." };
    }

    const pwd = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email: normalizedEmail,
        password: pwd,
        userType: UserType.USER,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        status: true,
      },
    });

    return {
      ok: true as const,
      user: {
        ...user,
        id: user.id.toString(),
      },
    };
  });

