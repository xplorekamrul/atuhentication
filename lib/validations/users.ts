import { Role } from "@prisma/client";
import * as z from "zod";

export const roleEnum = z.nativeEnum(Role);
export const statusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const userListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  q: z.string().trim().optional(),
  roles: z.array(roleEnum).optional(),
  statuses: z.array(statusEnum).optional(),
});

export type UserListQuery = z.infer<typeof userListSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  role: roleEnum,
  password: z.string().min(6),
});

export const updateUserInfoSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
});

export const updateUserPasswordSchema = z.object({
  id: z.string().cuid(),
  password: z.string().min(6),
  confirm: z.string().min(6),
}).refine((d) => d.password === d.confirm, {
  path: ["confirm"],
  message: "Passwords do not match",
});

export const updateUserStatusSchema = z.object({
  id: z.string().cuid(),
  status: statusEnum,
});

export const deleteUserSchema = z.object({
  id: z.string().cuid(),
});
