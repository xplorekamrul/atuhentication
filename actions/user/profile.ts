"use server";

import { auth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateProfileSchema = z.object({
   name: z.string().min(2, "Name required"),
   username: z.string().min(2, "Username required").max(50),
   email: z.string().email("Invalid email"),
   image: z.string().optional().nullable().or(z.literal("")),
});

export const updateProfile = actionClient
   .schema(updateProfileSchema)
   .action(async ({ parsedInput }) => {
      const session = await auth();
      if (!session?.user?.id) {
         return { ok: false as const, message: "Unauthorized" };
      }

      const { name, username, email, image } = parsedInput;
      const userId = session.user.id;

      // Check availability if changed
      const existing = await prisma.user.findFirst({
         where: {
            OR: [{ email }, { username }],
            NOT: { id: userId },
         },
      });

      if (existing) {
         if (existing.email === email) return { ok: false as const, message: "Email already taken" };
         if (existing.username === username) return { ok: false as const, message: "Username already taken" };
      }

      await prisma.user.update({
         where: { id: userId },
         data: {
            name,
            username,
            email,
            image: image === "" ? null : image
         },
      });

      revalidatePath("/profile");
      return { ok: true as const, message: "Profile updated" };
   });

const changePasswordSchema = z.object({
   oldPassword: z.string().min(1, "Current password required"),
   newPassword: z.string().min(6, "New password must be at least 6 chars"),
   confirmPassword: z.string().min(1, "Confirm password required"),
}).refine(data => data.newPassword === data.confirmPassword, {
   message: "Passwords do not match",
   path: ["confirmPassword"],
});

export const changePassword = actionClient
   .schema(changePasswordSchema)
   .action(async ({ parsedInput }) => {
      const session = await auth();
      if (!session?.user?.id) {
         return { ok: false as const, message: "Unauthorized" };
      }

      const { oldPassword, newPassword } = parsedInput;
      const userId = session.user.id;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { ok: false as const, message: "User not found" };

      const match = await verifyPassword(oldPassword, user.password);
      if (!match) {
         return { ok: false as const, message: "Incorrect current password" };
      }

      const hashedPassword = await hashPassword(newPassword);

      await prisma.user.update({
         where: { id: userId },
         data: { password: hashedPassword },
      });

      return { ok: true as const, message: "Password updated successfully" };
   });
