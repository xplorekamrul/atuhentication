import { serializeBigInt, toBigIntOrNull } from "@/lib/bigint-utils";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CACHE_TTL_SECONDS,
  getOrSetCache,
  hashCachePart,
} from "@/lib/redis/cache";
import { Prisma } from "@prisma/client";

export async function getCachedRolesList(
  page: number,
  pageSize: number,
  q: string
) {
  return getOrSetCache({
    key: `rbac:roles:list:${page}:${pageSize}:${hashCachePart(q)}`,
    tags: ["rbac-data", "rbac-roles"],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: async () => {
      const where: Prisma.RoleWhereInput = q ? { name: { contains: q } } : {};

      const [items, total] = await Promise.all([
        prisma.role.findMany({
          where,
          orderBy: { name: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: { adminRoles: true, roleRouteGroups: true },
            },
          },
        }),
        prisma.role.count({ where }),
      ]);

      return {
        ok: true as const,
        items: serializeBigInt(items),
        total,
        page,
        pageSize,
      };
    },
  });
}

export async function getCachedRoleCount() {
  return getOrSetCache({
    key: "rbac:roles:count",
    tags: ["rbac-data", "rbac-roles"],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: () => prisma.role.count(),
  });
}

export async function getCachedRouteGroupsList(
  page: number,
  pageSize: number,
  q: string
) {
  return getOrSetCache({
    key: `rbac:route-groups:list:${page}:${pageSize}:${hashCachePart(q)}`,
    tags: ["rbac-data", "rbac-route-groups"],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: async () => {
      const where: Prisma.RouteGroupWhereInput = q ? { name: { contains: q } } : {};

      const [items, total] = await Promise.all([
        prisma.routeGroup.findMany({
          where,
          orderBy: { name: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: { routes: true, roleRouteGroups: true },
            },
          },
        }),
        prisma.routeGroup.count({ where }),
      ]);

      return {
        ok: true as const,
        items: serializeBigInt(items),
        total,
        page,
        pageSize,
      };
    },
  });
}

export async function getCachedAllRouteGroups() {
  return getOrSetCache({
    key: "rbac:route-groups:all",
    tags: ["rbac-data", "rbac-route-groups"],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: async () => {
      const [items, total] = await Promise.all([
        prisma.routeGroup.findMany({
          take: 1000,
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.routeGroup.count(),
      ]);

      return {
        items: items.map((g) => ({ id: g.id.toString(), name: g.name })),
        total,
      };
    },
  });
}

export async function getCachedRoutesList(
  page: number,
  pageSize: number,
  q: string,
  groupId?: string
) {
  return getOrSetCache({
    key: `rbac:routes:list:${page}:${pageSize}:${hashCachePart(q)}:${groupId || "all"}`,
    tags: ["rbac-data", "rbac-routes"],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: async () => {
      const and: Prisma.RouteWhereInput[] = [];

      if (q) {
        and.push({
          OR: [{ path: { contains: q } }, { name: { contains: q } }],
        });
      }

      if (groupId) {
        const gId = toBigIntOrNull(groupId);
        if (gId) {
          and.push({ groupId: gId });
        }
      }

      const where: Prisma.RouteWhereInput = and.length ? { AND: and } : {};

      const [items, total] = await Promise.all([
        prisma.route.findMany({
          where,
          orderBy: { path: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            path: true,
            name: true,
            groupId: true,
            visibleToAdmin: true,
            visibleToSuperAdmin: true,
            editableByAdmin: true,
            editableBySuperAdmin: true,
            group: { select: { id: true, name: true } },
            createdAt: true,
          },
        }),
        prisma.route.count({ where }),
      ]);

      return {
        ok: true as const,
        items: serializeBigInt(items),
        total,
        page,
        pageSize,
      };
    },
  });
}

export async function getCachedAllRoutes() {
  return getOrSetCache({
    key: "rbac:routes:all",
    tags: ["rbac-data", "rbac-routes"],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: async () => {
      const [items, total] = await Promise.all([
        prisma.route.findMany({
          take: 1000,
          orderBy: { path: "asc" },
          select: {
            id: true,
            path: true,
            name: true,
            groupId: true,
            visibleToAdmin: true,
            visibleToSuperAdmin: true,
            editableByAdmin: true,
            editableBySuperAdmin: true,
            group: { select: { id: true, name: true } },
            createdAt: true,
          },
        }),
        prisma.route.count(),
      ]);

      return {
        items: items.map((r) => ({
          ...r,
          id: r.id.toString(),
          groupId: r.groupId.toString(),
          group: { id: r.group.id.toString(), name: r.group.name },
          createdAt: r.createdAt.toISOString(),
        })),
        total,
      };
    },
  });
}

export async function getCachedTotalRoutesCount(): Promise<number> {
  return getOrSetCache({
    key: "rbac:routes:count",
    tags: ["sidebar-routes", "rbac-data", "rbac-routes"],
    ttlSeconds: DEFAULT_CACHE_TTL_SECONDS,
    fetcher: () => prisma.route.count(),
  });
}
