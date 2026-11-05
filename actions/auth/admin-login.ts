"use server";

import { verifyPassword } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { loginSchema } from "@/lib/validations/auth";

export const adminLogin = actionClient
   .schema(loginSchema)
   .action(async ({ parsedInput }) => {
      const { email, password } = parsedInput;

      // Try admin only
      const admin = await prisma.admin.findUnique({
         where: { email },
         select: { id: true, email: true, password: true, level: true, name: true },
      });

      if (!admin) {
         return { ok: false as const, message: "No admin account found with this email." };
      }

      const match = await verifyPassword(password, admin.password);
      if (!match) {
         return { ok: false as const, message: "Incorrect password." };
      }

      return { ok: true as const, user: { id: admin.id, email: admin.email, role: admin.level, name: admin.name } };
   });
