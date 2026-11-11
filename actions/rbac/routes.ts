"use server";

import { serializeBigInt, toBigIntOrNull } from "@/lib/bigint-utils";
import { invalidateAdminPermissionsCache } from "@/lib/permissions/permissions";
import { getCachedRoutesList } from "@/lib/permissions/rbac-cache";
import { prisma } from "@/lib/prisma";
import { developerActionClient } from "@/lib/safe-action/clients";
import {
   routeCreateSchema,
   routeDeleteSchema,
   routeListSchema,
   routeUpdateSchema,
} from "@/lib/validations/rbac";
import { revalidateTag } from "next/cache";

export const listRoutes = developerActionClient
   .inputSchema(routeListSchema)
   .action(async ({ parsedInput }) => {
      const { page, pageSize, q, groupId } = parsedInput;
      return getCachedRoutesList(page, pageSize, q ?? "", groupId);
   });

export const createRoute = developerActionClient
   .inputSchema(routeCreateSchema)
   .action(async ({ parsedInput }) => {
      const { path, name, groupId, visibleToAdmin, visibleToSuperAdmin, editableByAdmin, editableBySuperAdmin } = parsedInput;
      const gId = toBigIntOrNull(groupId);

      if (!gId) {
         return { ok: false as const, error: "Invalid route group ID" };
      }

      // Check if group exists
      const group = await prisma.routeGroup.findUnique({
         where: { id: gId },
      });

      if (!group) {
         return { ok: false as const, error: "Route group not found" };
      }

      // Check if route already exists
      const existing = await prisma.route.findUnique({
         where: { path },
      });

      if (existing) {
         return { ok: false as const, error: "Route path already exists" };
      }

      const route = await prisma.route.create({
         data: {
            path,
            name,
            groupId: gId,
            visibleToAdmin: visibleToAdmin ?? true,
            visibleToSuperAdmin: visibleToSuperAdmin ?? false,
            editableByAdmin: editableByAdmin ?? false,
            editableBySuperAdmin: editableBySuperAdmin ?? false,
         },
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
      });

      // Revalidate Layer 1 (memory) and Layer 2 (Next.js cache tags) immediately
      await invalidateAdminPermissionsCache();
      revalidateTag(`route-${path}`, "max");

      return { ok: true as const, data: serializeBigInt(route) };
   });

export const updateRoute = developerActionClient
   .inputSchema(routeUpdateSchema)
   .action(async ({ parsedInput }) => {
      const { id, path, name, groupId, visibleToAdmin, visibleToSuperAdmin, editableByAdmin, editableBySuperAdmin } = parsedInput;
      const routeId = toBigIntOrNull(id);
      const gId = toBigIntOrNull(groupId);

      if (!routeId || !gId) {
         return { ok: false as const, error: "Invalid IDs" };
      }

      // Check if route exists
      const route = await prisma.route.findUnique({
         where: { id: routeId },
      });

      if (!route) {
         return { ok: false as const, error: "Route not found" };
      }

      // Check if group exists
      const group = await prisma.routeGroup.findUnique({
         where: { id: gId },
      });

      if (!group) {
         return { ok: false as const, error: "Route group not found" };
      }

      // Check if new path is already taken by another route
      if (path !== route.path) {
         const existing = await prisma.route.findUnique({
            where: { path },
         });
         if (existing) {
            return { ok: false as const, error: "Route path already exists" };
         }
      }

      const updated = await prisma.route.update({
         where: { id: routeId },
         data: {
            path,
            name,
            groupId: gId,
            visibleToAdmin: visibleToAdmin ?? route.visibleToAdmin,
            visibleToSuperAdmin: visibleToSuperAdmin ?? route.visibleToSuperAdmin,
            editableByAdmin: editableByAdmin ?? route.editableByAdmin,
            editableBySuperAdmin: editableBySuperAdmin ?? route.editableBySuperAdmin,
         },
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
      });

      // Revalidate Layer 1 (memory) and Layer 2 (Next.js cache tags) immediately
      await invalidateAdminPermissionsCache();
      revalidateTag(`route-${path}`, "max");
      revalidateTag(`route-${route.path}`, "max"); // Also invalidate old path if changed

      return { ok: true as const, data: serializeBigInt(updated) };
   });

export const deleteRoute = developerActionClient
   .inputSchema(routeDeleteSchema)
   .action(async ({ parsedInput }) => {
      const { id } = parsedInput;
      const routeId = toBigIntOrNull(id);

      if (!routeId) {
         return { ok: false as const, error: "Invalid route ID" };
      }

      // Check if route exists
      const route = await prisma.route.findUnique({
         where: { id: routeId },
      });

      if (!route) {
         return { ok: false as const, error: "Route not found" };
      }

      await prisma.route.delete({
         where: { id: routeId },
      });

      // Revalidate Layer 1 (memory) and Layer 2 (Next.js cache tags) immediately
      await invalidateAdminPermissionsCache();
      revalidateTag(`route-${route.path}`, "max");

      return { ok: true as const };
   });
