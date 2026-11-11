"use server";

import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action/clients";
import { userListSchema } from "@/lib/validations/users";

type StatusCounts = {
  ALL: number;
  ACTIVE: number;
  INACTIVE: number;
  SUSPENDED: number;
};

function accumulateStatusCounts(
  counts: StatusCounts,
  rows: Array<{ status: string }>
) {
  for (const row of rows) {
    if (row.status === "ACTIVE") counts.ACTIVE++;
    else if (row.status === "INACTIVE") counts.INACTIVE++;
    else if (row.status === "SUSPENDED") counts.SUSPENDED++;
  }
}

export const listUsers = adminActionClient
  .schema(userListSchema)
  .action(async ({ parsedInput }) => {
    const { page, pageSize, q, statuses, userType } = parsedInput;

    const searchFilter =
      q && q.trim().length > 0
        ? {
            OR: [
              { name: { contains: q.trim() } },
              { email: { contains: q.trim() } },
              { username: { contains: q.trim() } },
            ],
          }
        : {};

    const statusFilter =
      statuses && statuses.length > 0 ? { status: { in: statuses } } : {};

    const includeAdmins = !userType || userType === "ADMIN";
    const includeUsers = !userType || userType === "USER";

    const [allAdminsForCount, allUsersForCount] = await Promise.all([
      includeAdmins
        ? prisma.admin.findMany({
            where: {
              level: { not: "DEVELOPER" },
              ...searchFilter,
            },
            select: { status: true },
          })
        : Promise.resolve([]),
      includeUsers
        ? prisma.user.findMany({
            where: searchFilter,
            select: { status: true },
          })
        : Promise.resolve([]),
    ]);

    const counts: StatusCounts = {
      ALL: allAdminsForCount.length + allUsersForCount.length,
      ACTIVE: 0,
      INACTIVE: 0,
      SUSPENDED: 0,
    };

    accumulateStatusCounts(counts, allAdminsForCount);
    accumulateStatusCounts(counts, allUsersForCount);

    // Optimized single-table pagination when userType is explicitly separated
    if (userType === "ADMIN") {
      const where = {
        level: { not: "DEVELOPER" as const },
        ...searchFilter,
        ...statusFilter,
      };
      const [adminUsers, total] = await Promise.all([
        prisma.admin.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            level: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.admin.count({ where }),
      ]);

      return {
        ok: true as const,
        items: adminUsers.map((u) => ({
          id: `admin-${u.id}`,
          name: u.name,
          username: u.username,
          email: u.email,
          role: u.level,
          userType: "ADMIN" as const,
          status: u.status,
          createdAt: u.createdAt,
        })),
        total,
        counts,
        page,
        pageSize,
      };
    }

    if (userType === "USER") {
      const where = {
        ...searchFilter,
        ...statusFilter,
      };
      const [regularUsers, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        ok: true as const,
        items: regularUsers.map((u) => ({
          id: `user-${u.id.toString()}`,
          name: u.name,
          username: u.username,
          email: u.email,
          role: null,
          userType: "USER" as const,
          status: u.status,
          createdAt: u.createdAt,
        })),
        total,
        counts,
        page,
        pageSize,
      };
    }

    // Fallback: combined list when no userType filter is provided
    const [adminUsers, regularUsers] = await Promise.all([
      prisma.admin.findMany({
        where: {
          level: { not: "DEVELOPER" },
          ...searchFilter,
          ...statusFilter,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          level: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        where: {
          ...searchFilter,
          ...statusFilter,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const allUsers = [
      ...adminUsers.map((u) => ({
        id: `admin-${u.id}`,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.level,
        userType: "ADMIN" as const,
        status: u.status,
        createdAt: u.createdAt,
      })),
      ...regularUsers.map((u) => ({
        id: `user-${u.id.toString()}`,
        name: u.name,
        username: u.username,
        email: u.email,
        role: null,
        userType: "USER" as const,
        status: u.status,
        createdAt: u.createdAt,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const start = (page - 1) * pageSize;
    const paginatedItems = allUsers.slice(start, start + pageSize);

    return {
      ok: true as const,
      items: paginatedItems,
      total: allUsers.length,
      counts,
      page,
      pageSize,
    };
  });
