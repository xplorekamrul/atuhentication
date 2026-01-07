"use server";

import { prisma } from "@/lib/prisma";
import { authActionClient } from "@/lib/safe-action/clients";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const userInfoSchema = z.object({
   dateOfBirth: z.string().optional().nullable(),
   phone: z.string().optional().nullable(),
   gender: z.string().optional().nullable(),
   address: z.string().optional().nullable(),
   profession: z.string().optional().nullable(),
   hobbys: z.string().optional().nullable(),
});

export const upsertUserInfo = authActionClient
   .inputSchema(userInfoSchema)
   .action(async ({ parsedInput, ctx }) => {
      const { userId } = ctx; // Now string
      const { dateOfBirth, phone, gender, address, profession, hobbys } = parsedInput;

      // Convert date string to Date object if present
      const dob = dateOfBirth ? new Date(dateOfBirth) : null;

      await prisma.userInfo.upsert({
         where: { userId },
         create: {
            userId,
            dateOfBirth: dob,
            phone,
            gender,
            address,
            profession,
            hobbys,
         },
         update: {
            dateOfBirth: dob,
            phone,
            gender,
            address,
            profession,
            hobbys,
         },
      });

      revalidatePath("/profile");
      return { ok: true as const, message: "Info updated successfully" };
   });
