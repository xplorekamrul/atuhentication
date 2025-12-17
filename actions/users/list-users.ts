"use server";

import { prisma } from "@/lib/prisma";
import { authActionClient } from "@/lib/safe-action/clients";
import { userListSchema } from "@/lib/validations/users";
import { $Enums, Prisma } from "@prisma/client";

export const listUsers = authActionClient
  .schema(userListSchema)
  .action(async ({ parsedInput }) => {
    const { page, pageSize, q, roles, statuses } = parsedInput;

    const and: Prisma.UserWhereInput[] = [];

    if (q && q.trim().length) {
      and.push({
        OR: [
          { name: { contains: q.trim(), mode: Prisma.QueryMode.insensitive } },
          { email: { contains: q.trim(), mode: Prisma.QueryMode.insensitive } },
        ],
      });
    }

    if (roles && roles.length) {
      and.push({ role: { in: roles as $Enums.Role[] } });
    }

    if (statuses && statuses.length) {
      and.push({ status: { in: statuses as $Enums.AccountStatus[] } });
    }

    const where: Prisma.UserWhereInput = and.length ? { AND: and } : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          suspendedAt: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { ok: true as const, items, total, page, pageSize };
  });
