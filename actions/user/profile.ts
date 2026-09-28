
"use server";

import { auth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAuth } from "@/lib/admin-auth";
import { sendPasswordChangedEmail } from "@/lib/mail";

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
      let session = await auth();
      let userType: "USER" | "ADMIN" = "USER";

      if (!session?.user?.id) {
         session = await adminAuth() as any;
         if (session?.user?.id) {
            userType = "ADMIN";
         } else {
            return { ok: false as const, message: "Unauthorized" };
         }
      } else {
         if ((session.user as any).userType === "ADMIN") {
            userType = "ADMIN";
         }
      }

      const userId = BigInt(session.user.id);

      if (userType === "ADMIN") {
         const admin = await prisma.admin.findUnique({ where: { id: userId } });
         if (!admin) return { ok: false as const, message: "Admin not found" };

         const isPasswordValid = await verifyPassword(parsedInput.oldPassword, admin.password);
         if (!isPasswordValid) return { ok: false as const, message: "Current password is incorrect" };

         const hashedPassword = await hashPassword(parsedInput.newPassword);
         await prisma.admin.update({
            where: { id: userId },
            data: { password: hashedPassword, sessionVersion: { increment: 1 } },
         });

         if (admin.email && admin.name) {
            sendPasswordChangedEmail(admin.email, admin.name).catch(console.error);
         }
      } else {
         const user = await prisma.user.findUnique({ where: { id: userId } });
         if (!user) return { ok: false as const, message: "User not found" };

         const isPasswordValid = await verifyPassword(parsedInput.oldPassword, user.password);
         if (!isPasswordValid) return { ok: false as const, message: "Current password is incorrect" };

         const hashedPassword = await hashPassword(parsedInput.newPassword);
         await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword, sessionVersion: { increment: 1 } },
         });

         if (user.email && user.name) {
            sendPasswordChangedEmail(user.email, user.name).catch(console.error);
         }
      }

      revalidatePath("/profile");
      return { ok: true as const, message: "Password changed successfully" };
   });
