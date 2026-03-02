"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action/clients";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const upsertUserInfoSchema = z.object({
   dateOfBirth: z.string().nullable().optional(),
   phone: z.string().nullable().optional(),
   gender: z.string().nullable().optional(),
   address: z.string().nullable().optional(),
   profession: z.string().nullable().optional(),
   hobbys: z.string().nullable().optional(),
});

export const upsertUserInfo = actionClient
   .schema(upsertUserInfoSchema)
   .action(async ({ parsedInput }) => {
      const session = await auth();
      if (!session?.user?.id) {
         return { ok: false as const, message: "Unauthorized" };
      }

      const userId = BigInt(session.user.id);

      const data = {
         dateOfBirth: parsedInput.dateOfBirth ? new Date(parsedInput.dateOfBirth) : null,
         phone: parsedInput.phone || null,
         gender: parsedInput.gender || null,
         address: parsedInput.address || null,
         profession: parsedInput.profession || null,
         hobbys: parsedInput.hobbys || null,
      };

      await prisma.userInfo.upsert({
         where: { userId },
         update: data,
         create: {
            userId,
            ...data,
         },
      });

      revalidatePath("/profile");
      return { ok: true as const, message: "User info updated" };
   });
