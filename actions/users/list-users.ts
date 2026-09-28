"use server";

import { prisma } from "@/lib/prisma";
import { authActionClient } from "@/lib/safe-action/clients";
import { userListSchema } from "@/lib/validations/users";

export const listUsers = authActionClient
  .schema(userListSchema)
  .action(async ({ parsedInput }) => {
    const { page, pageSize, q } = parsedInput;

    // Build search filter
    const searchFilter = q && q.trim().length > 0
      ? {
        OR: [
          { name: { contains: q.trim() } },
          { email: { contains: q.trim() } },
        ],
      }
      : {};

    // Fetch all Admin users (excluding DEVELOPER level)
    const adminUsers = await prisma.admin.findMany({
      where: {
        level: {
          not: "DEVELOPER"
        },
        ...searchFilter,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        level: true,
        status: true,
        createdAt: true,
      },
    });

    // Fetch all regular Users
    const regularUsers = await prisma.user.findMany({
      where: searchFilter,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    // Combine all users with unique keys
    const allUsers = [
      ...adminUsers.map(u => ({
        id: `admin-${u.id.toString()}`,
        name: u.name,
        email: u.email,
        role: u.level,
        userType: "ADMIN" as const,
        status: u.status,
        createdAt: u.createdAt,
      })),
      ...regularUsers.map(u => ({
        id: `user-${u.id.toString()}`,
        name: u.name,
        email: u.email,
        role: null,
        userType: "USER" as const,
        status: u.status,
        createdAt: u.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedItems = allUsers.slice(start, end);

    return {
      ok: true as const,
      items: paginatedItems,
      total: allUsers.length,
      page,
      pageSize,
    };
  });
