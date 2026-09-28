"use server";

import { auth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateProfileSchema = z.object({
   name: z.string().min(1, "Name is required"),
   email: z.string().email("Invalid email"),
   username: z.string().min(1, "Username is required"),
   image: z.string().nullable().optional(),
});

const changePasswordSchema = z.object({
   oldPassword: z.string().min(1, "Current password is required"),
   newPassword: z.string().min(8, "Password must be at least 8 characters"),
   confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
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

      const userId = BigInt(session.user.id);

      // Check if email or username already exists for another user
      const existingUser = await prisma.user.findFirst({
         where: {
            AND: [
               { id: { not: userId } },
               {
                  OR: [
                     { email: parsedInput.email },
                     { username: parsedInput.username },
                  ],
               },
            ],
         },
      });

      if (existingUser) {
         return { ok: false as const, message: "Email or username already in use" };
      }

      await prisma.user.update({
         where: { id: userId },
         data: {
            name: parsedInput.name,
            email: parsedInput.email,
            username: parsedInput.username,
            image: parsedInput.image || null,
         },
      });

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

      const userId = BigInt(session.user.id);

      const user = await prisma.user.findUnique({
         where: { id: userId },
      });

      if (!user) {
         return { ok: false as const, message: "User not found" };
      }

      // Verify old password
      const isPasswordValid = await verifyPassword(parsedInput.oldPassword, user.password);

      if (!isPasswordValid) {
         return { ok: false as const, message: "Current password is incorrect" };
      }

      // Hash new password
      const hashedPassword = await hashPassword(parsedInput.newPassword);

      await prisma.user.update({
         where: { id: userId },
         data: { password: hashedPassword },
      });

      revalidatePath("/profile");
      return { ok: true as const, message: "Password changed successfully" };
   });
