"use server";

import { hashPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { createUserSchema } from "@/lib/validations/users";

export const createUser = superAdminActionClient
  .schema(createUserSchema)
  .action(async ({ parsedInput }) => {
    const { name, username, email, role, password } = parsedInput;
    const normalizedEmail = email.toLowerCase().trim();

    // Check uniqueness across BOTH Admin and User tables
    const [adminWithEmail, userWithEmail, adminWithUsername, userWithUsername] = await Promise.all([
      prisma.admin.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
      prisma.admin.findUnique({ where: { username }, select: { id: true } }),
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
    ]);

    if (adminWithEmail || userWithEmail) {
      return { ok: false as const, message: "Email already exists." };
    }
    if (adminWithUsername || userWithUsername) {
      return { ok: false as const, message: "Username already exists." };
    }

    const pwd = await hashPassword(password);
    const admin = await prisma.admin.create({
      data: { name, username, email: normalizedEmail, level: role, password: pwd },
      select: { id: true, name: true, username: true, email: true, level: true, status: true },
    });

    return { ok: true as const, user: admin };
  });
