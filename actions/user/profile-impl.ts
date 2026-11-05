"use server";

import { auth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { resetExponentialLockout } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z.string().min(1, "Username is required"),
  image: z.string().nullable().optional(),
});

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const updateProfile = actionClient
  .schema(updateProfileSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false as const, message: "Unauthorized" };
    }

    const userType = session.user.userType;
    const { name, email, username, image } = parsedInput;
    const normalizedEmail = email.toLowerCase().trim();

    if (userType === "ADMIN") {
      const adminId = session.user.id;
      // Check collision across BOTH Admin and User tables for other accounts
      const [adminCollision, userCollision] = await Promise.all([
        prisma.admin.findFirst({
          where: {
            OR: [{ email: normalizedEmail }, { username }],
            NOT: { id: adminId },
          },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: {
            OR: [{ email: normalizedEmail }, { username }],
          },
          select: { id: true },
        }),
      ]);

      if (adminCollision || userCollision) {
        return { ok: false as const, message: "Email or username already in use by another account." };
      }

      await prisma.admin.update({
        where: { id: adminId },
        data: {
          name,
          email: normalizedEmail,
          username,
          image: image || null,
        },
      });
    } else {
      const userBigIntId = BigInt(session.user.id);
      // Check collision across BOTH Admin and User tables for other accounts
      const [adminCollision, userCollision] = await Promise.all([
        prisma.admin.findFirst({
          where: {
            OR: [{ email: normalizedEmail }, { username }],
          },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: {
            OR: [{ email: normalizedEmail }, { username }],
            NOT: { id: userBigIntId },
          },
          select: { id: true },
        }),
      ]);

      if (adminCollision || userCollision) {
        return { ok: false as const, message: "Email or username already in use by another account." };
      }

      await prisma.user.update({
        where: { id: userBigIntId },
        data: {
          name,
          email: normalizedEmail,
          username,
          image: image || null,
        },
      });
    }

    revalidatePath("/profile");
    return { ok: true as const, message: "Profile updated successfully" };
  });

export const changePassword = actionClient
  .schema(changePasswordSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false as const, message: "Unauthorized" };
    }

    const userType = session.user.userType;
    const { oldPassword, newPassword } = parsedInput;

    if (userType === "ADMIN") {
      const adminId = session.user.id;
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        return { ok: false as const, message: "Admin account not found" };
      }

      const isPasswordValid = await verifyPassword(oldPassword, admin.password);
      if (!isPasswordValid) {
        return { ok: false as const, message: "Current password is incorrect" };
      }

      const hashedPassword = await hashPassword(newPassword);

      await prisma.admin.update({
        where: { id: adminId },
        data: { password: hashedPassword, sessionVersion: { increment: 1 } },
      });

      if (admin.email) {
        resetExponentialLockout(`exp:account:${admin.email.toLowerCase().trim()}`);
      }

      revalidatePath("/profile");
      return { ok: true as const, message: "Password changed successfully" };
    } else {
      const userBigIntId = BigInt(session.user.id);
      const user = await prisma.user.findUnique({
        where: { id: userBigIntId },
      });

      if (!user) {
        return { ok: false as const, message: "User account not found" };
      }

      if (!user.password) {
        return {
          ok: false as const,
          message: "This account was created with OAuth and does not have a password set.",
        };
      }

      const isPasswordValid = await verifyPassword(oldPassword, user.password);
      if (!isPasswordValid) {
        return { ok: false as const, message: "Current password is incorrect" };
      }

      const hashedPassword = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: userBigIntId },
        data: { password: hashedPassword, sessionVersion: { increment: 1 } },
      });

      if (user.email) {
        resetExponentialLockout(`exp:account:${user.email.toLowerCase().trim()}`);
      }

      revalidatePath("/profile");
      return { ok: true as const, message: "Password changed successfully" };
    }
  });
