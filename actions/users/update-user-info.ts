"use server";

import { prisma } from "@/lib/prisma";
import { superAdminActionClient } from "@/lib/safe-action/clients";
import { updateUserInfoSchema } from "@/lib/validations/users";
import { $Enums } from "@prisma/client";

export const updateUserInfo = superAdminActionClient
  .schema(updateUserInfoSchema)
  .action(async ({ parsedInput }) => {
    const { id, userType, name, email } = parsedInput;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. If explicitly USER
    if (userType === "USER") {
      const userBigIntId = BigInt(id);
      const targetUser = await prisma.user.findUnique({
        where: { id: userBigIntId },
        select: { id: true },
      });

      if (!targetUser) return { ok: false as const, message: "User not found." };

      const [adminEmailUsed, userEmailUsed] = await Promise.all([
        prisma.admin.findFirst({
          where: { email: normalizedEmail },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: { email: normalizedEmail, NOT: { id: userBigIntId } },
          select: { id: true },
        }),
      ]);

      if (adminEmailUsed || userEmailUsed) {
        return { ok: false as const, message: "Email already in use by another account." };
      }

      const user = await prisma.user.update({
        where: { id: userBigIntId },
        data: { name, email: normalizedEmail },
        select: { id: true, name: true, email: true, status: true },
      });

      return { ok: true as const, user: { ...user, id: user.id.toString() } };
    }

    // 2. If explicitly ADMIN
    if (userType === "ADMIN") {
      const targetAdmin = await prisma.admin.findUnique({
        where: { id },
        select: { id: true, level: true },
      });

      if (!targetAdmin) return { ok: false as const, message: "Admin not found." };

      if (targetAdmin.level === $Enums.AdminLevel.DEVELOPER) {
        return {
          ok: false as const,
          message: "Developer admins are protected and cannot be edited.",
        };
      }

      const [adminEmailUsed, userEmailUsed] = await Promise.all([
        prisma.admin.findFirst({
          where: { email: normalizedEmail, NOT: { id } },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: { email: normalizedEmail },
          select: { id: true },
        }),
      ]);

      if (adminEmailUsed || userEmailUsed) {
        return { ok: false as const, message: "Email already in use by another account." };
      }

      const admin = await prisma.admin.update({
        where: { id },
        data: { name, email: normalizedEmail },
        select: { id: true, name: true, email: true, level: true, status: true },
      });

      return { ok: true as const, user: admin };
    }

    // 3. Fallback: check Admin first, then User
    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, level: true },
    });

    if (targetAdmin) {
      if (targetAdmin.level === $Enums.AdminLevel.DEVELOPER) {
        return {
          ok: false as const,
          message: "Developer admins are protected and cannot be edited.",
        };
      }

      const [adminEmailUsed, userEmailUsed] = await Promise.all([
        prisma.admin.findFirst({
          where: { email: normalizedEmail, NOT: { id } },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: { email: normalizedEmail },
          select: { id: true },
        }),
      ]);

      if (adminEmailUsed || userEmailUsed) {
        return { ok: false as const, message: "Email already in use by another account." };
      }

      const admin = await prisma.admin.update({
        where: { id },
        data: { name, email: normalizedEmail },
        select: { id: true, name: true, email: true, level: true, status: true },
      });

      return { ok: true as const, user: admin };
    }

    if (/^\d+$/.test(id)) {
      const userBigIntId = BigInt(id);
      const targetUser = await prisma.user.findUnique({
        where: { id: userBigIntId },
        select: { id: true },
      });

      if (targetUser) {
        const [adminEmailUsed, userEmailUsed] = await Promise.all([
          prisma.admin.findFirst({
            where: { email: normalizedEmail },
            select: { id: true },
          }),
          prisma.user.findFirst({
            where: { email: normalizedEmail, NOT: { id: userBigIntId } },
            select: { id: true },
          }),
        ]);

        if (adminEmailUsed || userEmailUsed) {
          return { ok: false as const, message: "Email already in use by another account." };
        }

        const user = await prisma.user.update({
          where: { id: userBigIntId },
          data: { name, email: normalizedEmail },
          select: { id: true, name: true, email: true, status: true },
        });

        return { ok: true as const, user: { ...user, id: user.id.toString() } };
      }
    }

    return { ok: false as const, message: "Account not found." };
  });
